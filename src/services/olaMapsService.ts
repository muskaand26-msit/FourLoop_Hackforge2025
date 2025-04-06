import axios from 'axios';

const OLA_MAPS_AUTH_URL = 'https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token';
const OLA_MAPS_API_URL = 'https://api.olamaps.io';

interface OlaMapsAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class OlaMapsService {
  private static instance: OlaMapsService;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {}

  static getInstance(): OlaMapsService {
    if (!OlaMapsService.instance) {
      OlaMapsService.instance = new OlaMapsService();
    }
    return OlaMapsService.instance;
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token
    try {
      const response = await axios.post<OlaMapsAuthResponse>(
        OLA_MAPS_AUTH_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'openid',
          client_id: import.meta.env.VITE_OLA_MAPS_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_OLA_MAPS_CLIENT_SECRET || '',
        })
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Ola Maps access token:', error);
      throw error;
    }
  }

  async searchPlaces(searchText: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(
        `${OLA_MAPS_API_URL}/places/v1/autocomplete`,
        {
          params: {
            input: searchText,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  }

  // Add more API methods as needed
}

export const olaMapsService = OlaMapsService.getInstance(); 