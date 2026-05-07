import { RemoteCursor } from '../types';

interface RemoteCursorDisplayProps {
  cursor: RemoteCursor;
}

/**
 * Displays a remote user's cursor position with their avatar
 * Used in the editor to show live cursor tracking
 */
export function RemoteCursorDisplay({ cursor }: RemoteCursorDisplayProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        zIndex: 1000,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 h-6"
        style={{
          backgroundColor: cursor.userColor,
          boxShadow: `0 0 3px ${cursor.userColor}`,
        }}
      />

      {/* Cursor label with avatar */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap mt-0.5"
        style={{
          backgroundColor: cursor.userColor,
          boxShadow: `0 2px 8px rgba(0, 0, 0, 0.3)`,
        }}
      >
        {/* Avatar */}
        {cursor.userAvatar ? (
          <img
            src={cursor.userAvatar}
            alt={cursor.userName}
            className="w-4 h-4 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: cursor.userColor, opacity: 0.7 }}
          >
            {cursor.userName[0]?.toUpperCase()}
          </div>
        )}

        {/* Name */}
        <span>{cursor.userName}</span>
      </div>
    </div>
  );
}
