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

// Set up multer to handle multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });

// Gemini AI setup
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

            const prompt = `Extract the product names, quantities, and prices from the following text and return a JSON array like:
                            [
                            { "name": "Product A", "quantity": "1", "price": "100" },
                            ...
                            ] If no price is send then keep price field null.
                            ${req.body.text}`;

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


        const prompt = `Extract product names, quantities, and prices from the receipt image and return only a JSON array like:
                [
                { "name": "Product A", "quantity": "1", "price": "100" },
                ...
                ]`;

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