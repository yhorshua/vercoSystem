import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
} from 'lucide-react';

export type MessageStatus =
  | 'pending'
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

interface MessageBubbleProps {
  text: string;
  time: string;
  isSender: boolean;
  status?: MessageStatus;
}

export default function MessageBubble({
  text,
  time,
  isSender,
  status,
}: MessageBubbleProps) {
  const renderStatus = () => {
    switch (status) {
      case 'pending':
        return (
          <Clock3
            size={13}
            className="text-gray-400"
            aria-label="Mensaje pendiente"
          />
        );

      case 'sent':
        return (
          <Check
            size={14}
            className="text-gray-400"
            aria-label="Mensaje enviado"
          />
        );

      case 'delivered':
        return (
          <CheckCheck
            size={14}
            className="text-gray-400"
            aria-label="Mensaje entregado"
          />
        );

      case 'read':
        return (
          <CheckCheck
            size={14}
            className="text-blue-500"
            aria-label="Mensaje leído"
          />
        );

      case 'failed':
        return (
          <AlertCircle
            size={14}
            className="text-red-500"
            aria-label="Error al enviar el mensaje"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`mb-2 flex w-full ${
        isSender
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      <div
        className={`relative min-w-0 max-w-[85%] rounded-lg px-3 py-2 shadow-sm sm:max-w-[70%] ${
          isSender
            ? 'rounded-tr-none bg-[#dcf8c6] text-gray-800'
            : 'rounded-tl-none bg-white text-gray-800'
        }`}
      >
        <p className="whitespace-pre-wrap break-all pb-4 text-sm leading-relaxed">
          {text}
        </p>

        <div className="absolute bottom-1 right-2 flex items-center gap-1">
          <span className="whitespace-nowrap text-[10px] text-gray-500">
            {time}
          </span>

          {isSender && renderStatus()}
        </div>

        <div
          aria-hidden="true"
          className={`absolute top-0 h-0 w-0 ${
            isSender
              ? '-right-2 border-b-[8px] border-l-[8px] border-b-transparent border-l-[#dcf8c6]'
              : '-left-2 border-b-[8px] border-r-[8px] border-b-transparent border-r-white'
          }`}
        />
      </div>
    </div>
  );
}
