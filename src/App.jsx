import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Activity, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import NetworkBackground from './components/NetworkBackground';
import NetworkGraph from './components/NetworkGraph';
import ActivityLog from './components/ActivityLog';
import { predictConnection, getModelStatus } from "./data/api";

export default function App() {
  const [formData, setFormData] = useState({
    duration: '0',
    protocol_type: 'tcp',
    src_bytes: '215',
    dst_bytes: '45076',
    count: '1',
    num_failed_logins: '0',
    serror_rate: '0.00',
    dst_host_count: '150',
  });

  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState({ total: 0, attacks: 0 });
  const [newLogEntry, setNewLogEntry] = useState(null);
  const [modelOnline, setModelOnline] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await getModelStatus();
        setModelOnline(true);
      } catch {
        setModelOnline(false);
      }
    };
    checkStatus();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const analyzeConnection = async () => {
    setIsAnalyzing(true);
    setNewLogEntry(null);
    setApiError(null);

    try {
      const connectionData = {
        duration:          parseFloat(formData.duration) || 0,
        protocol_type:     formData.protocol_type,
        src_bytes:         parseFloat(formData.src_bytes) || 0,
        dst_bytes:         parseFloat(formData.dst_bytes) || 0,
        count:             parseFloat(formData.count) || 0,
        num_failed_logins: parseFloat(formData.num_failed_logins) || 0,
        serror_rate:       parseFloat(formData.serror_rate) || 0,
        dst_host_count:    parseFloat(formData.dst_host_count) || 0,
      };

      const prediction = await predictConnection(connectionData);

      setResult(prediction);
      setStats(prev => ({
        total:   prev.total + 1,
        attacks: prev.attacks + (prediction.status === 'attack' ? 1 : 0),
      }));

      setNewLogEntry({
        id:        Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        status:    prediction.status,
        ip: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      });
    } catch (error) {
      console.error('Prediction error:', error);
      setApiError('Failed to get prediction. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-hidden">
      <NetworkBackground />

      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Network Intrusion Detection System
              </h1>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              modelOnline
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-orange-500/10 border-orange-500/30'
            }`}>
              {modelOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm text-emerald-400 font-mono">Model Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400 font-mono">Mock Mode</span>
                </>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-cyan-500/20 p-3">
              <div className="text-xs text-gray-500 font-mono mb-1">Total Analyzed</div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.total}</div>
            </div>
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-red-500/20 p-3">
              <div className="text-xs text-gray-500 font-mono mb-1">Attacks Detected</div>
              <div className="text-2xl font-bold text-red-400 font-mono">{stats.attacks}</div>
            </div>
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-3">
              <div className="text-xs text-gray-500 font-mono mb-1">Normal Traffic</div>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                {stats.total - stats.attacks}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Panel - Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-cyan-500/20 p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <h2 className="text-xl font-mono text-cyan-400 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              CONNECTION INPUT
              <span className="text-xs text-purple-400 font-normal ml-auto">Key Features Only</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  DURATION (seconds)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  PROTOCOL TYPE
                </label>
                <select
                  value={formData.protocol_type}
                  onChange={(e) => handleInputChange('protocol_type', e.target.value)}
                  className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg cursor-pointer"
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    SRC BYTES
                  </label>
                  <input
                    type="number"
                    value={formData.src_bytes}
                    onChange={(e) => handleInputChange('src_bytes', e.target.value)}
                    className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    DST BYTES
                  </label>
                  <input
                    type="number"
                    value={formData.dst_bytes}
                    onChange={(e) => handleInputChange('dst_bytes', e.target.value)}
                    className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    COUNT
                  </label>
                  <input
                    type="number"
                    value={formData.count}
                    onChange={(e) => handleInputChange('count', e.target.value)}
                    className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    FAILED LOGINS
                  </label>
                  <input
                    type="number"
                    value={formData.num_failed_logins}
                    onChange={(e) => handleInputChange('num_failed_logins', e.target.value)}
                    className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  SERROR RATE
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.serror_rate}
                  onChange={(e) => handleInputChange('serror_rate', e.target.value)}
                  className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                />
                <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${parseFloat(formData.serror_rate || '0') * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-mono mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  DST HOST COUNT
                </label>
                <input
                  type="number"
                  value={formData.dst_host_count}
                  onChange={(e) => handleInputChange('dst_host_count', e.target.value)}
                  className="w-full bg-gray-950/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all font-mono text-lg"
                />
              </div>
            </div>

            <motion.button
              onClick={analyzeConnection}
              disabled={isAnalyzing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-lg font-mono tracking-wider relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ANALYZING...
                  </>
                ) : (
                  'ANALYZE CONNECTION'
                )}
              </span>
            </motion.button>

            {apiError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-xs text-red-300 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  {apiError}
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-xs text-purple-300 font-mono flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Binary classification — Normal or Attack detection using ML model.
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Prediction Result */}
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-cyan-500/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

              <h2 className="text-xl font-mono text-cyan-400 mb-4">PREDICTION RESULT</h2>

              {result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Main verdict card */}
                  <div className={`p-6 rounded-lg border-2 ${
                    result.status === 'normal'
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-red-500/10 border-red-500/50'
                  }`}>
                    <div className="flex items-center gap-4 mb-4">
                      {result.status === 'normal' ? (
                        <div className="p-3 rounded-full bg-emerald-500/20">
                          <Shield className="w-10 h-10 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="p-3 rounded-full bg-red-500/20">
                          <AlertTriangle className="w-10 h-10 text-red-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">
                          CLASSIFICATION
                        </div>
                        <div className={`text-3xl font-bold font-mono ${
                          result.status === 'normal' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {result.status === 'normal' ? 'NORMAL' : 'ATTACK'}
                        </div>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-2">
                        <span>MODEL CONFIDENCE</span>
                        <span className={`text-base font-bold ${
                          result.status === 'normal' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            result.status === 'normal'
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                              : 'bg-gradient-to-r from-red-400 to-red-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Binary probability visual */}
                  <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800/50">
                    <div className="text-xs text-gray-400 font-mono mb-3 tracking-widest">
                      PROBABILITY BREAKDOWN
                    </div>
                    <div className="space-y-3">
                      {/* Normal bar */}
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Normal
                          </span>
                          <span className="text-emerald-400">
                            {result.status === 'normal'
                              ? `${(result.confidence * 100).toFixed(1)}%`
                              : `${((1 - result.confidence) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: result.status === 'normal'
                                ? `${result.confidence * 100}%`
                                : `${(1 - result.confidence) * 100}%`
                            }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Attack bar */}
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Attack
                          </span>
                          <span className="text-red-400">
                            {result.status === 'attack'
                              ? `${(result.confidence * 100).toFixed(1)}%`
                              : `${((1 - result.confidence) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: result.status === 'attack'
                                ? `${result.confidence * 100}%`
                                : `${(1 - result.confidence) * 100}%`
                            }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-gray-500 py-12 font-mono">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>Awaiting connection data...</div>
                  <div className="text-xs mt-2 opacity-60">Fill in the features and click Analyze</div>
                </div>
              )}
            </div>

            {/* Network Visualization */}
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-cyan-500/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h2 className="text-xl font-mono text-cyan-400 mb-4">NETWORK VISUALIZATION</h2>
              <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-950/50">
                <NetworkGraph
                  isActive={isAnalyzing}
                  threatLevel={result?.status || 'normal'}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ActivityLog newEntry={newLogEntry} />
        </motion.div>
      </div>
    </div>
  );
}