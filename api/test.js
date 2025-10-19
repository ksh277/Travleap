module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vercel API is working!',
    timestamp: new Date().toISOString()
  });
};
