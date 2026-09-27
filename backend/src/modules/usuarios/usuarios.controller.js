const bcrypt = require('bcryptjs');
const usuariosModel = require('./usuarios.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const HASH_ROUNDS = 10;

const mapDatabaseError = (error, res) => {
  if (error.code === '23505') {
    return errorResponse(res, 'Ya existe un usuario con esos datos', error.detail, 409);
  }

  throw error;
};

const listUsuarios = async (req, res) => {
  const usuarios = await usuariosModel.list({
    search: req.query.search,
    estado: req.query.estado,
    rolId: req.query.rol_id
  });

  return successResponse(res, 'Usuarios obtenidos correctamente', {
    usuarios
  });
};

const createUsuario = async (req, res) => {
  try {
    const rolExists = await usuariosModel.roleExists(req.body.rol_id);

    if (!rolExists) {
      return errorResponse(res, 'El rol indicado no existe o esta inactivo', undefined, 400);
    }

    const password_hash = await bcrypt.hash(req.body.password, HASH_ROUNDS);
    const usuario = await usuariosModel.create({
      rol_id: req.body.rol_id,
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      username: req.body.username,
      email: req.body.email,
      telefono: req.body.telefono,
      estado: req.body.estado,
      password_hash
    });

    return successResponse(res, 'Usuario creado correctamente', { usuario }, 201);
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = {};

    if (req.body.rol_id !== undefined) {
      const rolExists = await usuariosModel.roleExists(req.body.rol_id);

      if (!rolExists) {
        return errorResponse(res, 'El rol indicado no existe o esta inactivo', undefined, 400);
      }

      fields.rol_id = req.body.rol_id;
    }

    ['nombre', 'apellido', 'username', 'email', 'telefono', 'estado'].forEach((field) => {
      if (req.body[field] !== undefined) {
        fields[field] = req.body[field] || null;
      }
    });

    if (req.body.password) {
      fields.password_hash = await bcrypt.hash(req.body.password, HASH_ROUNDS);
    }

    const usuario = await usuariosModel.update(id, fields);

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', undefined, 404);
    }

    return successResponse(res, 'Usuario actualizado correctamente', { usuario });
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateEstado = async (req, res) => {
  const usuario = await usuariosModel.updateEstado(Number(req.params.id), req.body.estado);

  if (!usuario) {
    return errorResponse(res, 'Usuario no encontrado', undefined, 404);
  }

  return successResponse(res, 'Estado de usuario actualizado correctamente', { usuario });
};

module.exports = {
  listUsuarios,
  createUsuario,
  updateUsuario,
  updateEstado
};
