// Valida la ventana de anticipación: si el pedido no es urgente, la fecha
// deseada debe caer al menos `leadTimeDays` días calendario después de hoy
// (comparando por día, no por hora exacta). Marcar "urgente" salta esta
// validación por completo.
export function isDesiredDateAllowed(desiredDate: Date, leadTimeDays: number, isUrgent: boolean): boolean {
  if (isUrgent) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + leadTimeDays);

  const desired = new Date(desiredDate);
  desired.setHours(0, 0, 0, 0);

  return desired.getTime() >= minDate.getTime();
}
