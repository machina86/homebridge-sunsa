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
    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      return {
        endpoint: endpoint,
        error: error,
      };
    }
  }

  async setPosition(value, idDevice) {
    const endpoint = `${this.baseUrl}/${this.idUser}/devices/${idDevice}?publicApiKey=${this.apiKey}`;
    try {
      const response = await axios.put(endpoint, {
        Position: value,
      });
      return response.data;
    } catch (error) {
      return {
        value: value,
        endpoint: endpoint,
        error: error,
      };
    }
  }
}
