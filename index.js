const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Basic Middleware
app.use(cors()); // Isse tumhara frontend is API ko call kar payega
app.use(express.json());
app.use('/output', express.static('output'));

// Create Output Folder if not exists
if (!fs.existsSync('output')) fs.mkdirSync('output');

// --- 🏠 Home Route ---
app.get('/', (req, res) => {
    res.send('Tools 24 API is Running! Ready for Render Deployment.');
});

// --- 🖼️ TOOL: IMAGE RESIZER / CONVERTER ---
app.post('/api/image-process', upload.single('image'), async (req, res) => {
    try {
        const outName = `img-${Date.now()}.jpg`;
        const outPath = path.join(__dirname, 'output', outName);
        
        // Processing (Resizing to 1080p by default)
        await sharp(req.file.path)
            .resize(1080)
            .jpeg({ quality: 80 })
            .toFile(outPath);

        fs.unlinkSync(req.file.path); // Cleanup temp file
        res.json({ success: true, downloadUrl: `/output/${outName}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 📄 TOOL: IMAGE TO PDF ---
app.post('/api/image-to-pdf', upload.array('images', 20), async (req, res) => {
    try {
        const pdfDoc = await PDFDocument.create();
        for (const file of req.files) {
            const imgData = fs.readFileSync(file.path);
            const image = await pdfDoc.embedJpg(imgData); // Handles JPG
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            fs.unlinkSync(file.path);
        }
        const pdfBytes = await pdfDoc.save();
        const outName = `doc-${Date.now()}.pdf`;
        fs.writeFileSync(path.join(__dirname, 'output', outName), pdfBytes);
        
        res.json({ success: true, downloadUrl: `/output/${outName}` });
    } catch (err) {
        res.status(500).json({ success: false, error: "PDF Conversion Failed" });
    }
});

// --- 🔗 TOOL: QR GENERATOR ---
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { text } = req.body;
        const outName = `qr-${Date.now()}.png`;
        const outPath = path.join(__dirname, 'output', outName);
        await QRCode.toFile(outPath, text);
        res.json({ success: true, downloadUrl: `/output/${outName}` });
    } catch (err) {
        res.status(500).json({ success: false, error: "QR Failed" });
    }
});

// --- 🧹 CLEANUP TASK (Optional) ---
// Har 1 ghante mein output folder saaf karne ka logic yahan add kar sakte ho

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
