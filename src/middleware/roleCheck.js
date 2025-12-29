export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin only.' 
    });
  }
  next();
};

export const adminOrCustomer = (req, res, next) => {
  if (!['admin', 'customer'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin or Customer only.' 
    });
  }
  next();
};

export const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};
