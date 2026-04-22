const verifyInternalApiKey = (req, res, next) => {
  const apiKey = req.get("x-internal-api-key");

  if (!process.env.INTERNAL_API_KEY) {
    return res
      .status(500)
      .json({ message: "INTERNAL_API_KEY is not configured" });
  }

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};

module.exports = verifyInternalApiKey;
