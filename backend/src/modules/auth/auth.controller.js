const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authModel = require('./auth.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const buildTokenPayload = (user) => ({
  id: user.id,
  username: user.username,
  rol_id: user.rol_id,
  rol: user.rol,
  nombre: user.nombre,
  apellido: user.apellido
});

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await authModel.findByUsernameWithPassword(username);

  if (!user || user.estado !== 'Activo') {
    return errorResponse(res, 'Usuario o contrasena incorrectos', undefined, 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return errorResponse(res, 'Usuario o contrasena incorrectos', undefined, 401);
  }

  await authModel.updateLastLogin(user.id);

  const safeUser = sanitizeUser(user);
  const token = jwt.sign(
    buildTokenPayload(safeUser),
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return successResponse(res, 'Inicio de sesion correcto', {
    token,
    user: safeUser
  });
};

const me = async (req, res) => {
  const user = await authModel.findById(req.user.id);

  if (!user || user.estado !== 'Activo') {
    return errorResponse(res, 'Usuario no disponible', undefined, 401);
  }

  return successResponse(res, 'Usuario autenticado', {
    user: sanitizeUser(user)
  });
};

module.exports = {
  login,
  me
};
