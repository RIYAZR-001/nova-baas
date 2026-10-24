const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const rawRole = req.user?.role || 'developer';
    const userRole = String(rawRole).toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => String(role).toLowerCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: [${allowedRoles.join(', ')}]. Current role: '${rawRole}'` 
      });
    }

    next();
  };
};

module.exports = checkRole;