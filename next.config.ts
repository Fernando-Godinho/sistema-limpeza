import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * As fotos enviadas pelo aplicativo ficam fora de /public e sao servidas por
   * uma rota autenticada, entao nao ha configuracao de imagens aqui.
   *
   * O envio das fotos passa por /api/photos e nao por uma acao de servidor.
   * Por isso deixamos o limite padrao de corpo das acoes (1 MB) como esta:
   * sem motivo para aumentar, aumentar so criaria superficie de abuso.
   */
  poweredByHeader: false,

  /*
   * Empacota o servidor com as dependencias que ele usa de verdade, para a
   * imagem Docker rodar com "node server.js" sem precisar de npm no servidor.
   * Se um dia esta linha sair, o Dockerfile para de funcionar: ele copia
   * exatamente a pasta que este modo gera.
   */
  output: "standalone",

  /*
   * Sem isto o Next bloqueia os arquivos de desenvolvimento (o recarregamento
   * automatico) quando a pagina e aberta pelo celular no IP da rede local.
   * O valor e so o nome do host, sem http:// e sem porta. Se o IP do
   * computador mudar de rede para rede, ajuste aqui e reinicie o servidor.
   */
  allowedDevOrigins: ["172.20.10.2"],
};

export default nextConfig;
