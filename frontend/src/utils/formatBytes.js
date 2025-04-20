// frontend/src/utils/formatBytes.js
export function formatBytes(bytes, decimals = 1) {
  // Si los bytes son null, undefined o 0, devuelve '0 Bytes'
  if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
  // Si los bytes son negativos (no debería pasar con UNSIGNED, pero por si acaso)
  if (bytes < 0) return "N/A"; // O manejar como error

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Manejar el caso de 0 bytes específicamente si no se capturó antes
  if (i < 0) return "0 Bytes";

  // Devolver el tamaño formateado
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Función para calcular el porcentaje de uso
export function calculateUsagePercent(used, quota) {
  if (quota === null || quota === undefined || quota <= 0) {
    // Si la cuota es null (admin/ilimitado) o 0/inválida, el porcentaje no aplica o es 0
    return 0;
  }
  if (used === undefined || used === null || used < 0) {
    return 0;
  }
  // Calcular porcentaje y asegurarse de que no pase de 100
  const percent = Math.min(100, (used / quota) * 100);
  return percent;
}
