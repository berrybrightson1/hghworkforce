export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Optional: show Material Symbol redeem instead of default success icon. */
  useRedeemIcon?: boolean;
}
