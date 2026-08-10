export function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في الخادم'
  });
}
