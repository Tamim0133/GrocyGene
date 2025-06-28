import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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


app.post('/process-text', async (req, res) => {
    try {
        if (req.body.text) {
            console.log('Received text:', req.body.text);

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
            const parsed = JSON.parse(response);

            console.log("✅ Clean JSON result:", parsed);
            return res.json({ result: parsed, error: null });
        }

        res.status(400).json({ error: 'Text not provided' });
    } catch (err) {
        console.error("Text processing error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

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

// -------------------------------------------
// ------------------------>  IP Address --------------->
// -------------------------------------------

app.listen(port, "192.168.0.104", () => {
    console.log(`🚀 Server running on http://192.168.0.104:${port}`);
});