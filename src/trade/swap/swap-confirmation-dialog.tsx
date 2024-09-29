import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Token } from "@/types";
import { SwapFlow, SwapStatus } from "@orbs-network/swap-ui";

export type SwapConfirmationDialogProps = {
  inToken: Token;
  outToken: Token;
  inAmount: string;
  outAmount: string;
  isOpen: boolean;
  onClose: () => void;
  confirmSwap: () => void;
  swapStatus?: SwapStatus;
  mainContent: React.ReactNode;
  successContent: React.ReactNode;
  failedContent: React.ReactNode;
  details?: React.ReactNode;
  title: string;
  buttonText: string;
};

export function SwapConfirmationDialog({
  inToken,
  outToken,
  isOpen,
  onClose,
  inAmount,
  outAmount,
  confirmSwap,
  swapStatus,
  mainContent,
  successContent,
  failedContent,
  title,
  details,
  buttonText,
}: SwapConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription></DialogDescription>
        <div className="flex flex-col gap-4">
          <div>
            <SwapFlow
              inAmount={inAmount}
              outAmount={outAmount}
              mainContent={mainContent}
              swapStatus={swapStatus}
              successContent={successContent}
              failedContent={failedContent}
              inToken={{
                symbol: inToken.symbol,
                logo: inToken.logoUrl,
              }}
              outToken={{
                symbol: outToken.symbol,
                logo: outToken.logoUrl,
              }}
            />
          </div>

          {!swapStatus && (
            <>
              {details}
              <Button size="lg" onClick={confirmSwap}>
                {buttonText}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
