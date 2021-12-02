import axios from 'axios';

export class SunsaApi {
  public readonly baseUrl:string;

  constructor(
    private readonly apiKey: string,
    private readonly idUser: number,
  ) {
    this.baseUrl = 'https://sunsahomes.com/api/public';
  }

  async getDevices() {
    const endpoint = `${this.baseUrl}/${this.idUser}/devices?publicApiKey=${this.apiKey}`;
    const response = await axios.get(endpoint)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        return this.axiosError(endpoint, error);
      });

    return response;
  }

  async setPosition(value, idDevice) {
    const endpoint = `${this.baseUrl}/${this.idUser}/devices/${idDevice}?publicApiKey=${this.apiKey}`;
    const response = await axios.put(endpoint, {
      Position: value,
    })
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        return this.axiosError(endpoint, error);
      });

    return response;
  }

  axiosError(endpoint, error) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          return 'Sunsa API Error: Unauthorized';
        case 404:
          return `Sunsa API Error: Endpoint not found - ${endpoint}`;
        default:
          if (error.response.status >= 500) {
            return 'Sunsa API Error: Response timeout';
          } else {
            return `Sunsa API Error: HTTP Status ${error.response.status}`;
          }
      }
    } else if (error.request) {
      switch (error.code) {
        case 'EAI_AGAIN':
          return 'Sunsa API Error: DNS lookup timeout';
        default:
          return `Sunsa API Error: Request error ${error.message}`;
      }
    } else {
      return `Sunsa API Error: ${error.message}`;
    }
  }
}
