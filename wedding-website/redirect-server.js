import express from "express";

const app = express();

app.get("/r", (req, res) => {
  const code = req.query.code || "";
  const album = req.query.album || "";

  const redirectUrl =
    `http://localhost:5173/?screen=photographer` +
    `&code=${encodeURIComponent(code)}` +
    `&album=${encodeURIComponent(album)}`;

  res.redirect(302, redirectUrl);
});

app.listen(4545, () => {
  console.log("Redirect server running on http://localhost:4545");
});