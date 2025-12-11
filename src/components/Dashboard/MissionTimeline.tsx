import React from 'react';
import { MissionEvent } from '../../types/domain';
import { format } from 'date-fns';
import { Clock, User, Activity } from 'lucide-react';

interface MissionTimelineProps {
  events: MissionEvent[];
  className?: string;
}

const MissionTimeline: React.FC<MissionTimelineProps> = ({ events, className = '' }) => {
  if (events.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No timeline events yet</p>
      </div>
    );
  }

  const getEventColor = (type: string): string => {
    if (type.includes('CREATED')) return 'bg-blue-500';
    if (type.includes('LAUNCHED') || type.includes('TAKEOFF')) return 'bg-green-500';
    if (type.includes('ARRIVED') || type.includes('SCENE')) return 'bg-purple-500';
    if (type.includes('COMPLETE')) return 'bg-emerald-500';
    if (type.includes('FAILED') || type.includes('FAULT')) return 'bg-red-500';
    if (type.includes('SNAPSHOT') || type.includes('HOTSPOT')) return 'bg-orange-500';
    if (type.includes('RETURN')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  // Sort events by timestamp (newest first for display)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className={`${className}`}>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="relative pl-8 pb-4 group">
            {/* Timeline line */}
            {index < sortedEvents.length - 1 && (
              <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-700 group-hover:bg-gray-600"></div>
            )}

            {/* Event dot */}
            <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full ${getEventColor(event.type)} ring-4 ring-gray-800 group-hover:ring-gray-700 transition-all`}></div>

            {/* Event content */}
            <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors border border-gray-700 group-hover:border-gray-600">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">{event.description}</h4>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-gray-400 font-mono flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(event.timestamp, 'HH:mm:ss')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {event.actor}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded font-mono">
                  {event.type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Event payload (if exists) */}
              {Object.keys(event.payload).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(event.payload).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="truncate">
                        <span className="text-gray-500">{key}:</span>{' '}
                        <span className="text-gray-300 font-mono">
                          {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) : String(value).slice(0, 30)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MissionTimeline;
