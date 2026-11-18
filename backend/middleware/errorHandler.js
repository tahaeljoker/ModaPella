/**
 * Global Centralized Express Error Handler
 * Formats Mongoose ValidationErrors, CastErrors, Mongo duplicate key (11000) errors,
 * JWT errors, and custom application errors into consistent, well-formed API responses.
 */

const errorHandler = (err, req, res, next) => {
  // If response headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'حدث خطأ داخلي في الخادم';
  let details = err.details || undefined;

  // 1. Mongoose Validation Error (e.g., required field missing, enum mismatch)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'بيانات الإدخال غير صالحة';
    details = Object.values(err.errors || {}).map(e => e.message);
  }

  // 2. Mongoose Cast Error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `المعرف غير صالح: ${err.value}`;
  }

  // 3. Mongo Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'الحقل';
    message = `القيمة المدخلة لـ (${field}) مسجلة بالفعل ولا يمكن تكرارها`;
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'رمز المصادقة غير صالح أو منتهي الصلاحية';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'انتهت صلاحية جلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً';
  }

  // Log server errors for monitoring
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {})
  });
};

module.exports = errorHandler;
