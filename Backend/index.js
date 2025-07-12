import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from 'bcrypt'; // if you're using ES modules
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js"; // 1. Import Supabase
import nodemailer from 'nodemailer';
import e from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// --- Supabase Connection ---
// 2. Initialize the client with your credentials from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// --- Middleware ---
// 3. Use CORS and body parsing middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const upload = multer({ storage: multer.memoryStorage() });


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const imageModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/', (req, res) => {
    res.send('Server is alive');
});
// ... (keep all your other code: imports, setup, other routes)

app.post('/process-text', async (req, res) => {
    // We now expect 'text' and 'userId' from the frontend
    const { text, userId } = req.body;

    if (!text || !userId) {
        return res.status(400).json({ error: 'Text and userId must be provided.' });
    }

    try {
        console.log(`Received text: "${text}" for user: ${userId}`);

        // --- Step 1: Get structured data from AI (Same as before) ---


        const prompt = `You will be given a shopping list in either Bangla, Banglish (Bangla written in English letters), or English. Your task is to extract a structured list of purchased products from the text and return it in JSON format as shown below:

                            [
                            { "name": "Product A", "quantity": "1", "price": "100" },
                            ...
                            ]

                            Instructions:
                            1. Extract **only the main product name** and convert it to a **generic English name**.
                            - Example: "chal" → "Rice", "lobon" → "Salt", "murgir mangsho" → "Chicken"
                            - Ignore brand names or unnecessary descriptors (e.g., "premium rice" → "Rice").
                            2. If a quantity is mentioned, extract it.
                            - Example: "2kg chal" → quantity: "2kg"
                            3. If a price is mentioned, include just the numeric value. If not, set "price": null.
                            4. The final JSON array should be clean, without extra formatting or explanation.

                            Now process the following text:
                            ${req.body.text}`

        const result = await textModel.generateContent(prompt);
        let response = await result.response.text();
        response = response.replace(/```json|```/g, '').trim();
        const parsedItems = JSON.parse(response);

        console.log("✅ Clean JSON result from AI:", parsedItems);

        // --- Step 2: Prepare the data for the 'user_stocks' table ---
        // This is the new, crucial logic

        // Use Promise.all to handle all product lookups concurrently
        const stockInsertPromises = parsedItems.map(async (item) => {
            // Find the product_id from the 'products' table using the name from the AI
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('product_id')
                .eq('product_name', item.name) // Case-sensitive match
                .single();

            if (productError || !productData) {
                console.warn(`⚠️ Product not found in DB: "${item.name}". Skipping.`);
                return null; // Skip this item if not found in our products table
            }

            // The 'quantity' column in your DB is a float. Let's parse it.
            const quantityValue = parseFloat(item.quantity) || 0;

            // Return an object that matches the 'user_stocks' table schema
            console.log("🔍 Checking userId type and value:", typeof userId, userId);

            return {
                user_id: userId,
                product_id: productData.product_id,
                quantity: quantityValue,
                purchase_date: new Date().toISOString(), // Set purchase date to now
            };
        });

        const stocksToInsert = (await Promise.all(stockInsertPromises)).filter(Boolean); // .filter(Boolean) removes any nulls

        if (stocksToInsert.length === 0) {
            return res.status(404).json({ message: "No valid products found to add to stock." });
        }

        // --- Step 3: Insert the prepared data into Supabase ---
        const { data: insertedData, error: insertError } = await supabase
            .from('user_stocks')
            .insert(stocksToInsert)
            .select();

        if (insertError) {
            console.error("Supabase insert error:", insertError.message);
            throw new Error(insertError.message); // This will be caught by the outer catch block
        }

        console.log("✅ Successfully inserted into user_stocks:", insertedData);
        res.status(201).json({ message: "Items added to stock successfully!", data: insertedData });

    } catch (err) {
        console.error("Text processing or DB error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// ... (keep the rest of your routes and the app.listen call)

// app.post('/process-text', async (req, res) => {
//     try {
//         if (req.body.text) {
//             console.log('Received text:', req.body.text);

//             const prompt = `You will be given a shopping list in either Bangla, Banglish (Bangla written in English letters), or English. Your task is to extract a structured list of purchased products from the text and return it in JSON format as shown below:

//                             [
//                             { "name": "Product A", "quantity": "1", "price": "100" },
//                             ...
//                             ]

//                             Instructions:
//                             1. Extract **only the main product name** and convert it to a **generic English name**.
//                             - Example: "chal" → "Rice", "lobon" → "Salt", "murgir mangsho" → "Chicken"
//                             - Ignore brand names or unnecessary descriptors (e.g., "premium rice" → "Rice").
//                             2. If a quantity is mentioned, extract it.
//                             - Example: "2kg chal" → quantity: "2kg"
//                             3. If a price is mentioned, include just the numeric value. If not, set "price": null.
//                             4. The final JSON array should be clean, without extra formatting or explanation.

//                             Now process the following text:
//                             ${req.body.text}`

//             const result = await textModel.generateContent(prompt);
//             let response = await result.response.text();
//             response = response.replace(/```json|```/g, '').trim();
//             const parsed = JSON.parse(response);

//             console.log("✅ Clean JSON result:", parsed);
//             return res.json({ result: parsed, error: null });
//         }

//         res.status(400).json({ error: 'Text not provided' });
//     } catch (err) {
//         console.error("Text processing error:", err.message);
//         res.status(500).json({ error: err.message });
//     }
// });

// Image upload and processing endpoint using Gemini
app.post('/process', upload.single('receiptImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        console.log('Received image:');


        const prompt = `You will be given a receipt image that may contain product names in Bangla, Banglish (Bangla written in English letters), or English. Your task is to extract a structured list of purchased products from the image and return it in JSON format as shown below:
                        [
                        { "name": "Product A", "quantity": "1", "price": "100" },
                        ...
                        ]

                        Instructions:
                        1. Extract only the **main product name** and convert it to a **generic English name**.
                        - Example: "chal" → "Rice", "lobon" → "Salt", "murgir mangsho" → "Chicken"
                        - Ignore brand names or unnecessary descriptors (e.g., "premium rice" → "Rice").
                        2. If a quantity is mentioned, extract it.
                        - Example: "2kg chal" → quantity: "2kg"
                        3. If a price is mentioned, include just the numeric value. If not, set "price": null.
                        4. Return a clean JSON array only, without extra formatting, markdown, or explanation.

                        Now process the following receipt image:
                        `;

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        const result = await imageModel.generateContent([prompt, imagePart]);
        let response = await result.response.text();
        response = response.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(response);
        console.log("Image result:", parsed);
        res.json({ result: parsed, error: null });
    } catch (err) {
        console.error("Image processing error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// =======================================================
// DATABASE CRUD ENDPOINTS (NEW SECTION)
// =======================================================

// Add these routes to your existing index.js file

// Authentication endpoints

const transporter = nodemailer.createTransport({
    service: process.env.SMTP_HOST,
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
    },
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    try {

        // Check if user already exists
        const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', email)
            .single();
        if (existingUserError && existingUserError.code !== 'PGRST116') { // PGRST116 means no rows found
            return res.status(500).json({ error: existingUserError.message });
        }
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        //Delete any existing OTP for this email
        const { error: deleteError } = await supabase
            .from('email_otps')
            .delete()
            .eq('email', email);
        if (deleteError) {
            console.error('Error deleting existing OTP:', deleteError);
            return res.status(500).json({ error: 'Failed to delete existing OTP' });
        }

        // Insert new OTP
        await supabase.from('email_otps').insert([{ email, otp, expires_at: expiresAt }]);

        await transporter.sendMail({
            from: '"GROCYGENE" <noreply@grocygene.com>',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`
        });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    user_name: name,
                }
            }
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // Create user record in your users table
        if (authData.user) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert([{
                    user_id: authData.user.id,
                    email: authData.user.email,
                    user_name: name,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (userError) {
                console.error('Error creating user record:', userError);
                // Continue anyway, as the auth user was created successfully
            }
        }

        res.status(201).json({
            message: 'User created successfully. Please check your email for verification.',
            user: authData.user,
            session: authData.session
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    const { data, error } = await supabase
        .from('email_otps')
        .select('*')
        .eq('email', email)
        .eq('otp', otp)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString()) // changed from .lt to .gt
        .maybeSingle();

    if (error || !data) {
        console.log('OTP verification error:', error);
        console.log("Data found:", data);
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await supabase
        .from('email_otps')
        .update({ verified: true })
        .eq('id', data.id);

    res.status(200).json({ message: 'OTP verified successfully' });
});


app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Signed in successfully',
            user: data.user,
            session: data.session
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Send OTP for password reset
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    try {
        // Check if user exists
        const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', email)
            .single();
        
        if (existingUserError || !existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

       //Delete any existing OTP for this email
        const { error: deleteError } = await supabase
            .from('email_otps')
            .delete()
            .eq('email', email);

        if (deleteError) {
            console.error('Error deleting existing OTP:', deleteError);
            return res.status(500).json({ error: 'Failed to delete existing OTP' });
        }

        // Insert new OTP
        await supabase.from('email_otps').insert([{ email, otp, expires_at: expiresAt }]);
        

        // Send OTP via email
        await transporter.sendMail({
            from: '"GROCYGENE" <noreply@grocygene.com>',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your password reset OTP is ${otp}. It will expire in 10 minutes.`
        });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});
const resetTokens = new Map();


// SIMPLIFIED: Password reset OTP verification
app.post('/api/auth/verify-reset-otp', async (req, res) => {
    const { email, otp } = req.body;
    
    try {
        // Verify the OTP exists and is valid
        const { data: otpData, error: otpError } = await supabase
            .from('email_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (otpError || !otpData) {
            console.log('OTP verification error:', otpError);
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as verified
        await supabase
            .from('email_otps')
            .update({ verified: true })
            .eq('id', otpData.id);

        // Generate a simple reset token
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Store the reset token temporarily (expires in 15 minutes)
        resetTokens.set(resetToken, {
            email: email,
            expires: Date.now() + 15 * 60 * 1000 // 15 minutes
        });

        console.log('Generated reset token for user:', email);

        res.status(200).json({ 
            message: 'OTP verified successfully',
            reset_token: resetToken
        });

    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SIMPLIFIED: Reset password using reset token
app.post('/api/auth/reset-password', async (req, res) => {
    const { newPassword, reset_token } = req.body;
    
    if (!newPassword || !reset_token) {
        return res.status(400).json({ error: 'New password and reset token are required' });
    }

    try {
        // Check if reset token is valid
        const tokenData = resetTokens.get(reset_token);
        
        if (!tokenData || tokenData.expires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const email = tokenData.email;

        // Get the user from auth system using admin client
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
            console.error('List users error:', listError);
            return res.status(500).json({ error: 'Failed to retrieve user from auth system' });
        }

        const authUser = authUsers.users.find(user => user.email === email);
        
        if (!authUser) {
            return res.status(404).json({ error: 'User not found in auth system' });
        }

        // Update password using admin client
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            password: newPassword
        });

        if (updateError) {
            console.error('Update password error:', updateError);
            return res.status(400).json({ error: updateError.message });
        }

        // Remove the used reset token
        resetTokens.delete(reset_token);

        console.log('Password updated successfully for user:', email);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Reset password failed:', err);
        res.status(500).json({ error: 'Server error' });
    }
});



app.post('/api/auth/signout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ message: 'Signed out successfully' });

    } catch (error) {
        console.error('Signout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get user profile with family composition
app.get("/api/users/:userId/profile", async (req, res) => {
  const { userId } = req.params

  console.log("Fetching user profile for:", userId)

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        user_id,
        user_name,
        email,
        region,
        adult_male,
        adult_female,
        child,
        created_at
      `)
      .eq("user_id", userId)
      .single()

    if (userError) {
      console.error("User fetch error:", userError)
      return res.status(404).json({ error: "User not found" })
    }

    console.log("User profile found:", user)
    res.json(user)
  } catch (error) {
    console.error("Unexpected error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get user stocks with product details (enhanced version of your existing route)
app.get("/api/users/:userId/stocks", async (req, res) => {
  const { userId } = req.params

  console.log("Fetching stocks for user:", userId)

  try {
    // Fetch stocks with product details
    const { data: stocks, error: stocksError } = await supabase
      .from("user_stocks")
      .select(`
        stock_id,
        user_id,
        product_id,
        quantity,
        purchase_date,
        household_events,
        season,
        predicted_finish_date,
        actual_finish_date,
        created_at,
        products (
          product_id,
          product_name,
          unit,
          base_consumption_adult_male,
          base_consumption_adult_female,
          base_consumption_child
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (stocksError) {
      console.error("Stocks fetch error:", stocksError)
      return res.status(500).json({ error: "Failed to fetch stocks" })
    }

    console.log("Stocks found:", stocks?.length || 0)
    res.json(stocks || [])
  } catch (error) {
    console.error("Unexpected error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})



// Get comprehensive prediction data (user + stocks)
app.get("/api/users/:userId/prediction-data", async (req, res) => {
  const { userId } = req.params

  console.log("Fetching prediction data for user:", userId)

  try {
    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        user_id,
        user_name,
        region,
        adult_male,
        adult_female,
        child
      `)
      .eq("user_id", userId)
      .single()

    if (userError) {
      console.error("User fetch error:", userError)
      return res.status(404).json({ error: "User not found" })
    }

    // Fetch current stocks
    const { data: stocks, error: stocksError } = await supabase
      .from("user_stocks")
      .select(`
        stock_id,
        product_id,
        quantity,
        household_events,
        season,
        predicted_finish_date,
        purchase_date,
        products (
          product_name,
          unit,
          base_consumption_adult_male,
          base_consumption_adult_female,
          base_consumption_child
        )
      `)
      .eq("user_id", userId)
      .is("actual_finish_date", null) // Only get items that haven't been consumed yet
      .order("created_at", { ascending: false })

    if (stocksError) {
      console.error("Stocks fetch error:", stocksError)
      return res.status(500).json({ error: "Failed to fetch stocks" })
    }

    // Prepare response data
    const predictionData = {
      user: {
        user_id: user.user_id,
        region: user.region || "urban",
        family: {
          adult_male: user.adult_male || 0,
          adult_female: user.adult_female || 0,
          child: user.child || 0,
        },
      },
      stocks: stocks || [],
      summary: {
        total_items: stocks?.length || 0,
        total_quantity: stocks?.reduce((sum, stock) => sum + stock.quantity, 0) || 0,
        items_with_predictions: stocks?.filter((stock) => stock.predicted_finish_date).length || 0,
      },
    }

    console.log("Prediction data prepared:", predictionData.summary)
    res.json(predictionData)
  } catch (error) {
    console.error("Unexpected error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update stock prediction (individual stock item)
app.put("/api/stocks/:stockId/prediction", async (req, res) => {
  const { stockId } = req.params
  const { predicted_finish_date, season, household_events } = req.body

  console.log("Updating prediction for stock:", stockId, {
    predicted_finish_date,
    season,
    household_events,
  })

  try {
    const { data: updatedStock, error: updateError } = await supabase
      .from("user_stocks")
      .update({
        predicted_finish_date,
        season,
        household_events,
      })
      .eq("stock_id", stockId)
      .select()
      .single()

    if (updateError) {
      console.error("Stock update error:", updateError)
      return res.status(500).json({ error: "Failed to update stock prediction" })
    }

    console.log("Stock prediction updated successfully:", updatedStock)
    res.json(updatedStock)
  } catch (error) {
    console.error("Unexpected error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})


app.post("/api/update-predictions", async (req, res) => {
  const { userId, predictions, season, household_events } = req.body
  console.log("Bulk updating predictions for user:", userId)
  try {
    // First, get all current stocks for the user with product details
    const { data: stocks, error: stocksError } = await supabase
      .from("user_stocks")
      .select(`
        stock_id,
        product_id,
        quantity,
        products (
          product_name
        )
      `)
      .eq("user_id", userId)
      .is("actual_finish_date", null) // Only update items that haven't been consumed

    if (stocksError) {
      console.error("Error fetching stocks:", stocksError)
      return res.status(500).json({ error: "Failed to fetch user stocks" })
    }

    // Create updates based on predictions
    const updates = []

    stocks.forEach((stock) => {
      const productName = stock.products?.product_name?.toLowerCase()

      // Find matching prediction
      const prediction = Object.entries(predictions).find(
        ([predProductName]) => predProductName.toLowerCase() === productName,
      )

      if (prediction) {
        const [, predictionData] = prediction
        updates.push(
          supabase
            .from("user_stocks")
            .update({
              predicted_finish_date: predictionData.predicted_finish_date,
              season: season || "summer",
              household_events: household_events || "normal",
            })
            .eq("stock_id", stock.stock_id),
        )
      }
    })

    // Execute all updates
    const results = await Promise.allSettled(updates)

    const successful = results.filter((result) => result.status === "fulfilled").length
    const failed = results.filter((result) => result.status === "rejected").length

    console.log(`Bulk update completed: ${successful} successful, ${failed} failed`)

    res.json({
      message: "Predictions updated successfully",
      updated_count: successful,
      failed_count: failed,
      total_stocks: stocks.length,
    })
  } catch (error) {
    console.error("Error in bulk update:", error)
    res.status(500).json({ error: "Failed to update predictions" })
  }
})


// family member add 
app.post('/api/family-setup', async (req, res) => {
  const { email, region, family_members } = req.body;

  if (!email || !Array.isArray(family_members)) {
    return res.status(400).json({ error: 'Missing email or family members' });
  }

  try {
    const { data, error } = await supabase
      .from('family_data')
      .upsert([
        {
          email,
          region: region || null,  // store null if no region provided
          family_members,
        }
      ]);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Family data saved successfully', data });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// family fetch 
app.get('/api/family/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  try {
    const { data, error } = await supabase
      .from('family_data')
      .select('family_members')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'No data found' });
    }

    res.status(200).json(data.family_members);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// member count 
app.post('/api/update-user-demographics', async (req, res) => {
  const { email, family_members } = req.body;

  if (!email || !Array.isArray(family_members)) {
    return res.status(400).json({ error: 'Missing email or family members' });
  }

  // Calculate demographic counts
  let adult_male = 0;
  let adult_female = 0;
  let child = 0;

  family_members.forEach(member => {
    if (member.age !== null && !isNaN(member.age)) {
      if (member.age < 18) {
        child++;
      } else if (member.gender === 'Male') {
        adult_male++;
      } else if (member.gender === 'Female') {
        adult_female++;
      }
    }
  });

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        adult_male,
        adult_female,
        child
      })
      .eq('email', email); // assumes email is a unique identifier

    if (error) {
      console.error('Supabase Update Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'User demographics updated successfully', data });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/// --- USERS TABLE ---
app.get('/api/users', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/users/:id', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*').eq('user_id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/users', async (req, res) => {
    const { data, error } = await supabase.from('users').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/users/:id', async (req, res) => {
    const { data, error } = await supabase.from('users').update(req.body).eq('user_id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/users/:id', async (req, res) => {
    const { error } = await supabase.from('users').delete().eq('user_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'User deleted successfully' });
});


// --- PRODUCTS TABLE ---
app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*').eq('product_id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('products').update(req.body).eq('product_id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/products/:id', async (req, res) => {
    const { error } = await supabase.from('products').delete().eq('product_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Product deleted successfully' });
});



app.get('/api/stocks/:stockId', async (req, res) => {
    const { data, error } = await supabase.from('user_stocks').select('*').eq('stock_id', req.params.stockId).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/stocks', async (req, res) => {
    const { data, error } = await supabase.from('user_stocks').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/stocks/:stockId', async (req, res) => {
    const { data, error } = await supabase.from('user_stocks').update(req.body).eq('stock_id', req.params.stockId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/stocks/:stockId', async (req, res) => {
    const { error } = await supabase.from('user_stocks').delete().eq('stock_id', req.params.stockId);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Stock record deleted successfully' });
});


// --- GROCERY_ITEMS TABLE ---
// Get all grocery items for a specific user
app.get('/api/users/:userId/grocery-items', async (req, res) => {
    const { data, error } = await supabase.from('grocery_items').select('*').eq('user_id', req.params.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/grocery-items/:id', async (req, res) => {
    const { data, error } = await supabase.from('grocery_items').select('*').eq('id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/grocery-items', async (req, res) => {
    const { data, error } = await supabase.from('grocery_items').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/grocery-items/:id', async (req, res) => {
    const { data, error } = await supabase.from('grocery_items').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/grocery-items/:id', async (req, res) => {
    const { error } = await supabase.from('grocery_items').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Grocery item deleted successfully' });
});


// --- NOTIFICATIONS TABLE ---
// Get all notifications for a specific user
app.get('/api/users/:userId/notifications', async (req, res) => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/notifications/:id', async (req, res) => {
    const { data, error } = await supabase.from('notifications').select('*').eq('id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/notifications', async (req, res) => {
    const { data, error } = await supabase.from('notifications').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/notifications/:id', async (req, res) => {
    const { data, error } = await supabase.from('notifications').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/notifications/:id', async (req, res) => {
    const { error } = await supabase.from('notifications').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Notification deleted successfully' });
});


// --- FEEDBACK_DATA TABLE ---
// Get all feedback from a specific user
app.get('/api/users/:userId/feedback', async (req, res) => {
    const { data, error } = await supabase.from('feedback_data').select('*').eq('user_id', req.params.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/feedback/:feedbackId', async (req, res) => {
    const { data, error } = await supabase.from('feedback_data').select('*').eq('feedback_id', req.params.feedbackId).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/feedback', async (req, res) => {
    const { data, error } = await supabase.from('feedback_data').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/feedback/:feedbackId', async (req, res) => {
    const { data, error } = await supabase.from('feedback_data').update(req.body).eq('feedback_id', req.params.feedbackId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/feedback/:feedbackId', async (req, res) => {
    const { error } = await supabase.from('feedback_data').delete().eq('feedback_id', req.params.feedbackId);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Feedback deleted successfully' });
});


// --- PREDICTION_OUTPUTS TABLE ---
// Get all predictions for a specific user
app.get('/api/users/:userId/predictions', async (req, res) => {
    const { data, error } = await supabase.from('prediction_outputs').select('*').eq('user_id', req.params.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/predictions/:predictionId', async (req, res) => {
    const { data, error } = await supabase.from('prediction_outputs').select('*').eq('prediction_id', req.params.predictionId).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/predictions', async (req, res) => {
    const { data, error } = await supabase.from('prediction_outputs').insert([req.body]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.put('/api/predictions/:predictionId', async (req, res) => {
    const { data, error } = await supabase.from('prediction_outputs').update(req.body).eq('prediction_id', req.params.predictionId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/predictions/:predictionId', async (req, res) => {
    const { error } = await supabase.from('prediction_outputs').delete().eq('prediction_id', req.params.predictionId);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Prediction deleted successfully' });
});




// -------------------------------------------
// ------------------------>  IP Address --------------->
// -------------------------------------------

const IP ="192.168.0.109";
app.listen(port, IP, () => {
    console.log(`🚀 Server running on ${IP}:${port}`);
});

