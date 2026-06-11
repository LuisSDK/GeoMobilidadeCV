export const ILHAS_CV = [
  'Santiago', 'São Vicente', 'Sal', 'Boa Vista', 'Fogo',
  'Santo Antão', 'Maio', 'Brava', 'São Nicolau', 'Santa Luzia',
];

export const MUNICIPIOS_CV: Record<string, string[]> = {
  Santiago: ['Praia', 'Santa Cruz', 'Santa Catarina', 'São Domingos', 'Tarrafal', 'Ribeira Grande de Santiago', 'São Miguel', 'São Lourenço dos Órgãos', 'São Salvador do Mundo'],
  'São Vicente': ['São Vicente'],
  Sal: ['Sal', 'Santa Maria'],
  'Boa Vista': ['Boa Vista'],
  Fogo: ['São Filipe', 'Santa Catarina do Fogo', 'Mosteiros'],
  'Santo Antão': ['Ribeira Grande', 'Porto Novo', 'Paul'],
  Maio: ['Maio'],
  Brava: ['Brava'],
  'São Nicolau': ['Ribeira Brava', 'Tarrafal de São Nicolau'],
};

export const OPERADORES = ['TECV', 'EV Cabo Verde', 'NOSi EPE', 'ACV', 'ENAPOR', 'Câmara Municipal', 'SNS Cabo Verde', 'Pestana Hotels', 'Club Med', 'Meliá Hotels', 'Foya Branca Resort'];

export const TIPOS_CONECTOR = ['Type 2', 'CCS', 'CHAdeMO', 'CCS + Type 2', 'CCS + CHAdeMO', 'Type 2 + CHAdeMO', 'CCS 100kW'];

export const CENTRO_CV = { lat: 16.0, lng: -24.0, zoom: 8 };

export const CENTRO_SANTIAGO = { lat: 15.05, lng: -23.6, zoom: 10 };

export const ILHA_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  Santiago: { lat: 15.05, lng: -23.6, zoom: 10 },
  'São Vicente': { lat: 16.89, lng: -24.98, zoom: 12 },
  Sal: { lat: 16.72, lng: -22.93, zoom: 12 },
  'Boa Vista': { lat: 16.15, lng: -22.87, zoom: 12 },
  Fogo: { lat: 14.92, lng: -24.46, zoom: 11 },
  'Santo Antão': { lat: 17.09, lng: -25.17, zoom: 11 },
  Maio: { lat: 15.14, lng: -23.20, zoom: 12 },
  Brava: { lat: 14.87, lng: -24.72, zoom: 12 },
  'São Nicolau': { lat: 16.58, lng: -24.25, zoom: 12 },
};

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@geomobilidade.cv', password: 'Admin@2024!', role: 'admin', nome: 'Carlos Tavares', org: 'NOSi EPE' },
  user: { email: 'utilizador@geomobilidade.cv', password: 'User@2024!', role: 'utilizador', nome: 'Ana Fonseca', org: 'Cidadão' },
};
