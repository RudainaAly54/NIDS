import { useEffect, useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";

const ActivityLog = ({newEntry}) => {
    const [logs, setLogs]  = useState([
           {
      id: 1,
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      status: 'normal',
      ip: '192.168.1.45'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 90000).toLocaleTimeString(),
      status: 'attack',
      attackType: 'DoS',
      ip: '10.0.0.23'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      status: 'normal',
      ip: '172.16.0.12'
    },
    ]);

    useEffect(()=> {
        if (newEntry) {
            setLogs(prev => [newEntry, ...prev].slice(0, 5)) // Keep only the latest 5 entries
        }
    }, [newEntry])

    return (
        <section
        className = "bg-gray-900/40 backdrop-blur-sm rounded-lg border border-cyan-500/20 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"/>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-cyan-400 font-mono tracking-wider">RECENT CONNECTIONS LOG</h3>
                <div className="text-xs text-gray-500 font-mono">
                    Total analyzed: <span className="text-cyan-400">{logs.length}</span>
                </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {logs.map((log, index) => (
                    <div
                    key = {log.id}
                    className="flex items-center gap-3 p-2 bg-gray-950/50 rounded border-gray-800/50 hover:border-cyan-500/30 transition-all duration-300"
                    style = {{animation: index === 0 && newEntry ? 'slideIn 0.5s ease-out': undefined}}
                    >
                        <div className={`flex-shrink-0 ${log.status === 'normal' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {log.status === 'normal' ? (
                                <Shield className="w-4 h-4" />
                            ): (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                        </div>

                        <div className="flex-1 flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">{log.timestamp}</span>
                            <span className="text-gray-500">{log.ip}</span>
                            <span className={`px-2 py-0.5 rounded 
                                ${log.status === 'normal' 
                                ? 'bg-emerald-500/10 text-emerald-400'
                                 : 'bg-red-500/10 text-red-400'}`}>
                                    {log.status === 'normal' ? 'Normal' : log.attackType || 'Attack'}
                                 </span>
                        </div>
                    </div>
                ))}
            </div>
            <style>
                {`
                @keyframes slideIn {
                from {
                opacity: 0;
                transform: translateX(-20px)
            }
            to {
            opacity: 1;
            transform: translateX(0);
        }
        }
        .custom-scrollbar::-webkit-scrollbar{
        width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track{
        background: rgba(0,0,0,0.3);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb{
        background: rgba(0, 240, 255, 0.5);
        border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hoover{
        background: rgba(0, 240, 255, 0.5);
        }
        `}</style>
        </section>
    )
}

export default ActivityLog;