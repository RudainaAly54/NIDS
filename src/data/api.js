import axios from 'axios';

//Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http: //localhost:5000/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== 'false';

//axios instance 
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

//Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

//Response Interceptor
apiClient.interceptors.response.use(
   (response) => response,
   (error) => {
    if(error.response) {
        console.error('API Error:', error.response.data);
    } else if (error.request) {
        console.error('Network Error:', error.message);
    } else {
        console.error('Error:', error.message);
    }
    return Promise.reject(error);
   }
);

//Mock Prediction Data function
const generateMockPredictionData = (data) => {
    const hasHighFailedLogins = data.num_failed_logins > 2;
    const hasHighSerrorRate = data.serror_rate > 0.5;
    const isLargeBytesTransfer = data.src_bytes > 10000 || data.dst_bytes> 100000;
    const isHighCount = data.count > 100;

    const attackWeight = 
        (hasHighFailedLogins ? 0.3 : 0) +
        (hasHighSerrorRate ? 0.25 : 0) + 
        (isLargeBytesTransfer ? 0.2 : 0) +
        (isHighCount ?  0.15 : 0);

        const isAttack = attackWeight > 0.3 || Math.random() > 0.65;
        
        let selectedAttackType; 

        if(isHighCount || isLargeBytesTransfer) {
            selectedAttackType = 'DoS';
        } else if (hasHighFailedLogins) {
            selectedAttackType = Math.random() > 0.5 ? 'R2L' : 'U2R';
        } else {
            selectedAttackType = 'probe';
        }

        const probabilities = {
            DoS: Math.random() * 0.3,
            R2L: Math.random() * 0.2,
            U2R: Math.random() * 0.15,
            probe: Math.random() * 0.25,
        };

        if(isAttack) {
            probabilities[selectedAttackType] = 0.55 + Math.random() * 0.4;
        }

        return {
            status: isAttack ? 'attack' : 'normal',
            attackType: isAttack ? selectedAttackType : undefined,
            confidence: isAttack ? 0.75 + Math.random() *0.24 : 0.85 +Math.random() *0.14,
            attackProbabilities: probabilities,
            timestamp: new Date().toISOString(),
            processingTime: Math.random() * 200 + 50,
        };
};

//API Methods
export const predictConnection = async (data) => {
    if(USE_MOCK_DATA) {
        console.log('Using mock prediction (backend not connected)');
        await new Promise(resolve => setTimeout(resolve, 500 +Math.random() * 500));
        return generateMockPredictionData(data);
    }
    try {
        const response = await apiClient.post('predict',  {
            features: {
                duration: data.duration, 
                protocol_type: data.protocol_type,
                src_bytes: data.src_bytes, 
                dst_bytes: data.dst_bytes,
                count: data.count,
                num_failed_logins: data.num_failed_logins,
                serror_rate: data.serror_rate,
                dst_host_count: data.dst_host_count,
            }
        });

        return response.data;

    } catch (error) {
        console.error('Failed to fetch prediction, falling back to mock data');
        return generateMockPredictionData(data);
    }
}; 

export const getModelStatus = async () => {
    if(USE_MOCK_DATA){
        return {
      online: true,
      modelVersion: '1.0.0-mock',
      accuracy: 97.4,
      lastUpdated: new Date().toISOString(),
    };
    }

    try {
        const response = await apiClient.get('/status');
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch model status', { cause: error });
    }
};

export const getPredictionHistory = async () => {
    if(USE_MOCK_DATA) {
        return [];
    }

    try{
        const response = await apiClient.get('/history');
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch prediction history', { cause: error });
    }
}

export default apiClient;
