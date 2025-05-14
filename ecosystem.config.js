module.exports = {
    apps: [
      {
        name: 'app',              // Nome do processo
        script: './foragarantia.js',        // Caminho para o seu arquivo de aplicação
        instances: 1,              // Número de instâncias do aplicativo
        autorestart: true,         // Se o app deve reiniciar automaticamente
        watch: false,              // Se o PM2 deve "assistir" mudanças no arquivo
        max_memory_restart: '1G',  // Reiniciar o app se usar mais de 1GB de memória
      },
    ],
  };
  