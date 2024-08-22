const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

connectDB();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://csv-loader-novi-31103055b9bb.herokuapp.com/",
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-device-id",
      "x-encrypted-machine-id",
    ],
  })
);
app.use(express.json());

app.use("/api/licence", require("./routes/licenseRoutes"));
app.use("/api/korisnici", require("./routes/userRoutes"));
app.use("/api/excel", require("./routes/excelFormatRoute"));
app.use("/api/admin", require("./routes/verifyAdminRoute"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
