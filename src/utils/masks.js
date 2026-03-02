/**
 * Aplica máscara de telefone brasileiro.
 * - 10 dígitos: (XX) XXXX-XXXX  (fixo)
 * - 11 dígitos: (XX) XXXXX-XXXX (celular, incluindo o 9)
 */
export function maskTelefone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const len = digits.length;

  if (len === 0) return '';
  if (len <= 2) return `(${digits}`;
  if (len <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (len <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
