const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const STANDARD_USER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const User = sequelize.define(
  "User",
  {
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },
    storage_quota_bytes: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    storage_used_bytes: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "Users",
  }
);

User.beforeCreate(async (user, options) => {
  if (
    user.role === "user" &&
    (user.storage_quota_bytes === null ||
      typeof user.storage_quota_bytes === "undefined")
  ) {
    user.storage_quota_bytes = STANDARD_USER_QUOTA_BYTES;
    console.log(
      `[Hook beforeCreate] Asignando cuota estándar de ${STANDARD_USER_QUOTA_BYTES} bytes al usuario '${user.username}' (rol: ${user.role}).`
    );
  } else if (user.role === "admin") {
    user.storage_quota_bytes = null;
    console.log(
      `[Hook beforeCreate] Asegurando cuota NULL (ilimitada) para admin '${user.username}'.`
    );
  }
});

module.exports = User;
