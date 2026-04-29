import axios from 'axios';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('API Error:', error.response.data);
        } else if (error.request) {
            console.error('Network Error:', error.message);
        } else {
            console.error('Error:', error.message);
        }
        return Promise.reject(error);
    }
);

// API Methods
export const predictConnection = async (data) => {
    // The frontend only collects 8 key features.
    // We fill the remaining 33 with safe defaults before sending to the backend.
    const response = await apiClient.post('/api/predict', {
        // ── 8 features from the form ──────────────────────────────────────
        duration:          data.duration          ?? 0,
        protocol_type:     data.protocol_type     ?? 'tcp',
        src_bytes:         data.src_bytes         ?? 0,
        dst_bytes:         data.dst_bytes         ?? 0,
        count:             data.count             ?? 0,
        num_failed_logins: data.num_failed_logins ?? 0,
        serror_rate:       data.serror_rate       ?? 0.0,
        dst_host_count:    data.dst_host_count    ?? 0,

        // ── remaining 33 features — safe neutral defaults ─────────────────
        service:                      'http',
        flag:                         'SF',
        land:                         0,
        wrong_fragment:               0,
        urgent:                       0,
        hot:                          0,
        logged_in:                    1,
        num_compromised:              0,
        root_shell:                   0,
        su_attempted:                 0,
        num_root:                     0,
        num_file_creations:           0,
        num_shells:                   0,
        num_access_files:             0,
        num_outbound_cmds:            0,
        is_host_login:                0,
        is_guest_login:               0,
        srv_count:                    data.count      ?? 0,
        srv_serror_rate:              data.serror_rate ?? 0.0,
        rerror_rate:                  0.0,
        srv_rerror_rate:              0.0,
        same_srv_rate:                1.0,
        diff_srv_rate:                0.0,
        srv_diff_host_rate:           0.0,
        dst_host_srv_count:           data.dst_host_count ?? 0,
        dst_host_same_srv_rate:       1.0,
        dst_host_diff_srv_rate:       0.0,
        dst_host_same_src_port_rate:  0.0,
        dst_host_srv_diff_host_rate:  0.0,
        dst_host_serror_rate:         data.serror_rate ?? 0.0,
        dst_host_srv_serror_rate:     data.serror_rate ?? 0.0,
        dst_host_rerror_rate:         0.0,
        dst_host_srv_rerror_rate:     0.0,
    });

    const r = response.data;
    // r = { prediction, is_attack, confidence, probabilities: { Normal, Attack } }

    // Map backend response → shape the frontend expects
    return {
        status:     r.is_attack ? 'attack' : 'normal',
        attackType: r.is_attack ? 'Attack' : undefined,
        confidence: r.confidence,

        // Frontend renders a bar chart for each key in attackProbabilities
        attackProbabilities: {
            Normal: r.probabilities.Normal,
            Attack: r.probabilities.Attack,
        },

        timestamp:      new Date().toISOString(),
        processingTime: null,
    };
};

export const getModelStatus = async () => {
    const response = await apiClient.get('/api/model-info');
    const r = response.data;

    return {
        online:       true,
        modelVersion: `${r.kernel}-svm-pca${r.n_pca_components}`,
        accuracy:     parseFloat((r.test_accuracy * 100).toFixed(2)),
        lastUpdated:  new Date().toISOString(),
    };
};

export const getPredictionHistory = async () => {
    // History is tracked in frontend state, not stored in backend
    return [];
};



export default apiClient;
