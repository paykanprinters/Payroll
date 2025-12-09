import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/utils/sanitize-html';

type ReportPreviewDialogProps = {
  title: string;
  html: string;
  open: boolean;
  onClose: () => void;
  onDownloadPdf?: () => void;
};

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  title,
  html,
  open,
  onClose,
  onDownloadPdf,
}) => {
  const clean = sanitizeHtml(html);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[70vh] overflow-auto border rounded-md p-4 bg-white">
          <div dangerouslySetInnerHTML={{ __html: clean }} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {onDownloadPdf && (
            <Button variant="default" onClick={onDownloadPdf}>
              Download PDF
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewDialog;