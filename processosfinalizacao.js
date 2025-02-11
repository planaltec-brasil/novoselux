const fs = require("fs");
const puppeteer = require("puppeteer");
const axios = require("axios");
const AWS = require("aws-sdk");
const https = require("https");
const path = require("path");
const diretorio = path.join(__dirname); // Caminho do diretório com as fotos
const Sequelize = require("sequelize");
var posts = [];
var arquivos;
const { format, addDays } = require("date-fns");
const moment = require("moment");
const clipboardy = require("node-clipboardy");

var iDados = 0;
let dados = [];
let json = {};


// Configure o cliente S3
const s3 = new AWS.S3({
  accessKeyId: s3Config.key,
  secretAccessKey: s3Config.secret,
  region: s3Config.region,
});

/**
 * Gera uma URL pré-assinada para acessar um objeto no S3.
 * @param {string} item Nome do arquivo (pode incluir ou não '/').
 * @param {number} validade Tempo de validade em segundos (padrão: 1200 = 20 minutos).
 * @returns {string} URL pré-assinada.
 */
function getFile(item, validade = 1200) {
  const sanitizedItem = item.startsWith("/") ? item.slice(1) : item;
  const key = `uploads/${sanitizedItem}`;
  const params = {
    Bucket: s3Config.bucket,
    Key: key,
    Expires: validade,
  };

  try {
    return s3.getSignedUrl("getObject", params);
  } catch (error) {
    console.error("Erro ao gerar a URL pré-assinada:", error.message);
    return null;
  }
}

// Função simplificada para excluir arquivos .jpeg
function excluirFotos(diretorio) {
  fs.readdir(diretorio, (err, arquivos) => {
    if (err) {
      console.error("Erro ao ler o diretório:", err);
      return;
    }

    arquivos.forEach((arquivo) => {
      if (path.extname(arquivo).toLowerCase() === ".jpeg") {
        const caminhoArquivo = path.join(diretorio, arquivo);
        fs.unlink(caminhoArquivo, (err) => {
          if (err) {
            console.error(`Erro ao excluir o arquivo ${arquivo}:`, err);
          } else {
            console.log(`Arquivo ${arquivo} excluído com sucesso.`);
          }
        });
      }
    });
  });
}

/**
 * Faz o download de um arquivo usando uma URL e salva localmente.
 * @param {string} url URL pré-assinada do arquivo no S3.
 * @param {string} fileName Nome do arquivo local onde será salvo.
 */
function downloadFile(url, fileName) {
  const dest = path.join(__dirname, fileName);
  const file = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log("Download concluído:", dest);
            resolve(dest);
          });
        } else {
          console.error(
            "Erro ao baixar o arquivo. Código HTTP:",
            response.statusCode
          );
          reject(new Error("Erro ao baixar o arquivo."));
        }
      })
      .on("error", (err) => {
        fs.unlink(dest, () => { });
        console.error("Erro ao baixar o arquivo:", err.message);
        reject(err);
      });
  });
}

class Vinculacao {
  acaoModel = require("../../../acaoModel/acaoModel");
  constructor() {
    this.acaoModel = new this.acaoModel();
  }

  async logando(i = 0, arr = []) {
    const browser = await puppeteer.launch({
      headless: false,
    });

    console.log("login");
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto("https://parceiros.electrolux.com.br/");
    await page.waitForTimeout(2000);
    //Login
    await page.waitForSelector("#email");
    await page.click("#email");
    await page.type("#email", "elericloud@gmail.com");
    await page.waitForTimeout(2000);
    //Senha
    await page.waitForSelector("#password");
    await page.click("#password");
    await page.type("#password", "Elux@7197");
    await page.waitForTimeout(2000);
    //Entrar
    await page.waitForSelector("#next");
    await page.click("#next");

    // teste.tomaOK(page);
    await page.waitForTimeout(5000);
    posts = arr.length > 0 ? arr : await teste.carregaOS();
    await teste.listagem(page, browser, posts, i);
    return;
  }
  async listagem(page, browser, arr = [], i = 0) {
    try {
      console.log(arr);
      await page.waitForTimeout(5000);
      let OS = arr[i].OS;
      let AG = arr[i].AG;
      let idos = arr[i].id;
      let numeroNF = arr[i].numero_nf;
      if (numeroNF) {
        numeroNF = numeroNF.replace(/\D/g, "").substring(0, 10);
      }
      let dataNF = moment(arr[i].data_nf).format("DD-MM-YYYY");
      dataNF = dataNF.split("-").join("");
      console.log(dataNF);

      let modeloComercial = arr[i].modelo_comercial;
      let pncElectrolux = arr[i].pnc_ml_electrolux;
      let numeroSerie = arr[i].numero_serie;
      let tensao = arr[i].tensao;
      let revendedor = arr[i].revendedor;
      if (
        revendedor &&
        (revendedor.toLowerCase().includes("outros revend") ||
          revendedor.toLowerCase().includes("outro revend"))
      ) {
        revendedor = "Outros revendedores";
      }
      let modeloUsual = arr[i].modelo_usual;
      console.log("Modelo Comercial", modeloComercial);
      console.log("PNC", pncElectrolux);
      console.log("Voltagem", tensao);
      console.log("Revendedor", revendedor);
      console.log("Modelo Usual", modeloUsual);
      console.log(arr.length);
      console.log(i);
      if (
        (modeloComercial === null || modeloComercial.trim() === "") &&
        (pncElectrolux === null || pncElectrolux.trim() === "") &&
        (numeroSerie === null || numeroSerie.trim() === "") &&
        (tensao === null || tensao.trim() === "") &&
        (revendedor === null || revendedor.trim() === "") &&
        (modeloUsual === null || modeloUsual.trim() === "")
      ) {
        console.log("Dados incompletos, pulando para o próximo registro");
        await page.waitForTimeout(4000);
        teste.listagem(page, browser, arr, ++i);
        return;
      }

      if (AG == null) {
        AG = "28/01/2024"; //Data qualquer, não uso data de AG no momento
      }
      var AGNovo = AG.split("/").join("-");
      console.log(AGNovo);
      const AGDate = new Date(AGNovo.split("-").reverse().join("-"));
      const today = new Date();

      // Remove time portion for accurate date comparison
      today.setHours(0, 0, 0, 0);
      AGDate.setHours(0, 0, 0, 0);

      if (AGDate <= today) {
        // Add 3 days if date is in the past
        let newDate = addDays(today, 3);

        // Check if the new date is Sunday (0 = Sunday)
        if (newDate.getDay() === 0) {
          // If Sunday, add one more day to move to Monday
          newDate = addDays(newDate, 1);
        }

        AGNovo = format(newDate, "dd-MM-yyyy");
      }
      // console.log("Data atualizada", AGNovo);
      var date = new Date(AG.split("/").reverse().join("/"));
      var novaData = new Date().toDateString().split("T");
      var novaData = new Date(novaData);
      var horaAtual = new Date();
      var horas = horaAtual.getHours() + 1; // Adicionando uma hora
      var minutos = horaAtual.getMinutes();
      const hoje = new Date();
      const dataFormatada = format(hoje, "dd/MM/yyyy");

      // Formatação dos minutos para adicionar um zero à esquerda, se necessário
      if (minutos < 10) {
        minutos = "0" + minutos;
      }

      var horarioFormatado = horas + ":" + minutos;
      // console.log(horarioFormatado);
      // console.log(date);
      // console.log(novaData);

      //Ordens de Serviço
      await page.waitForSelector(
        "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
      );
      await page.click(
        "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
      );
      await page.waitForTimeout(2000);

      //Pesquisa o Sinistro
      await page.waitForSelector(
        "#main-content > app-service-order-list > div > div.row.d-flex.no-print > div:nth-child(1) > input"
      );
      await page.type(
        "#main-content > app-service-order-list > div > div.row.d-flex.no-print > div:nth-child(1) > input",
        OS
      );

      //Buscar
      await page.waitForTimeout(2000);
      await page.click(
        "#main-content > app-service-order-list > div > div.row.mt-3.no-print > div:nth-child(4) > lib-elux-button > button > div:nth-child(2)"
      );
      await page.waitForTimeout(8000);

      try {
        
        //Entra no sinistro
        await page.click(
          "#main-content > app-service-order-list > div > div:nth-child(8) > div > lib-elux-datatable > div > div.table-row.clickable > div:nth-child(1) > a"
        );
        await page.waitForTimeout(6000);
        } catch (error) {
           console.log("Sinistro não encontrado.");
           await page.waitForTimeout(4000);
           teste.listagem(page, browser, arr, ++i);
           return;
        }
      await page.waitForTimeout(6000);

      if(arr[i].status != 53 && arr[i].status != 69){
      //Só vai anexar foto se o status for diferente de 53 e 69
      const idData = await this.carregaID(idos);
      console.log(idData);

      if (idData && idData.length > 0) {
        await page.waitForTimeout(3000);

        // Processa cada imagem do idData
        for (const item of idData) {
          if (item.name_img) {
            const url = getFile(item.name_img);
            if (url) {
              const extensao = path.extname(item.name_img);
              const nomeCategoria = teste.getNomePorCategoria(item.categoria);
              const novoNome = `${nomeCategoria}_${item.idOs}${extensao}`;
              console.log("Novo Nome", novoNome);
              // Download com novo nome
              await downloadFile(url, novoNome);

              // Upload do arquivo
              await page.waitForSelector(
                "#main-content > ng-component > div > div:nth-child(4) > app-attachment-section > div:nth-child(2) > div.col-3.button-container > lib-elux-button > button"
              );
              await page.click(
                "#main-content > ng-component > div > div:nth-child(4) > app-attachment-section > div:nth-child(2) > div.col-3.button-container > lib-elux-button > button"
              );
              await page.waitForTimeout(4000);

              const inputFileSelector = 'input[type="file"]';
              await page.waitForSelector(inputFileSelector);

              const filePath = path.join(__dirname, novoNome);
              const inputFile = await page.$(inputFileSelector);
              await inputFile.uploadFile(filePath);

              console.log(`Imagem ${novoNome} anexada com sucesso!`);

              await page.waitForTimeout(3000);
              await page.click(
                "#main-content > app-attachment-create > div > div:nth-child(9) > div > lib-elux-button > button"
              );
              await page.waitForTimeout(2000);

              // Remove arquivo local
              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Erro ao apagar ${novoNome}:`, err);
                } else {
                  console.log(`Arquivo ${novoNome} apagado com sucesso!`);
                }
              });
            }
          }
        }

        console.log("Todos os arquivos foram processados com sucesso!");
      }
    }
      await page.waitForTimeout(4000);
      //Inserir itens no detalhamento
      await page.waitForSelector(
        "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(3) > lib-elux-button > button"
      );
      await page.click(
        "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(3) > lib-elux-button > button"
      );

      await page.waitForTimeout(5000);
      try {

        if (numeroNF) {
          //Número da NF
          await page.waitForSelector(
            "#main-content > ng-component > div > form > div:nth-child(1) > div:nth-child(1) > input"
          );
          await page.click(
            "#main-content > ng-component > div > form > div:nth-child(1) > div:nth-child(1) > input",
            { clickCount: 3 }
          );

          await page.waitForTimeout(3000);
          await page.keyboard.type(numeroNF);
          await page.waitForTimeout(2000);
        }

        if (arr[i].data_nf && moment(arr[i].data_nf).isValid()) {
          dataNF = moment(arr[i].data_nf).format("DDMMYYYY");
        } else {
          dataNF = "00000000";
        }

        if (dataNF && dataNF !== "00000000") {
          //Data da NF de compra
          await page.waitForSelector(
            "#main-content > ng-component > div > form > div:nth-child(1) > div:nth-child(2) > lib-elux-datepicker > div > input"
          );
          await page.click(
            "#main-content > ng-component > div > form > div:nth-child(1) > div:nth-child(2) > lib-elux-datepicker > div > input",
            { clickCount: 3 }
          );
          await page.waitForTimeout(3000);
          await page.keyboard.type(dataNF);
          await page.waitForTimeout(2000);
        }

        if (modeloUsual) {
          //Modelo Usual
          await page.waitForSelector(
            "#main-content > ng-component > div > form > div:nth-child(2) > div:nth-child(1) > lib-elux-input-search > div > input"
          );
          await page.click(
            "#main-content > ng-component > div > form > div:nth-child(2) > div:nth-child(1) > lib-elux-input-search > div > input",
            { clickCount: 3 }
          );
          await page.waitForTimeout(3000);
          await page.keyboard.type(modeloUsual);
          await page.waitForTimeout(2000);
        }

        if (modeloComercial) {
          //Modelo Comercial
          const identificador = modeloComercial; // Sua variável identificadora
          // Passo 1: Clique no input para abrir o dropdown
          await page.click("input.selected-option"); // Seletor do input que abre o dropdown
          await page.waitForTimeout(3000);
          // Passo 2: Esperar o dropdown aparecer
          await page.waitForSelector(".dropdown-list", { visible: true });

          // Passo 3: Verifique se o identificador está na lista de opções
          const itemExistente = await page.$x(
            `//ul[@class="dropdown-list"]/li[normalize-space(text())="${identificador}"]`
          );

          if (itemExistente.length > 0) {
            // Se o identificador for encontrado, clique no item correspondente
            console.log("Item encontrado:", identificador);
            await itemExistente[0].click();
            await page.waitForTimeout(2000);
            await page.keyboard.press("Enter");
          } else {
            // Se o identificador não for encontrado, clique no primeiro item da lista
            console.log(
              "Item não encontrado. Clicando no primeiro item da lista."
            );
            const primeiroItem = await page.$x(
              '//ul[@class="dropdown-list"]/li[2]'
            ); // O primeiro item real da lista está no índice 2
            await primeiroItem[0].click();
            await page.waitForTimeout(2000);
            await page.keyboard.press("Enter");
          }
        }
        await page.waitForTimeout(3000);
      } catch (error) {
        await page.waitForTimeout(2000);
        teste.listagem(page, browser, arr, ++i);
        return;
      }
      // if (pncElectrolux) {
      // PNC/ML
      try {
        const pnc = pncElectrolux;
        await page.click(
          "#main-content > ng-component > div > form > div:nth-child(3) > div:nth-child(1) > lib-elux-dropdown > div > input"
        );

        await page.waitForSelector(".dropdown-list", { visible: true });

        // Verifique se o identificador está na lista de opções
        const itemExistentePNC = await page.$x(
          `//ul[@class="dropdown-list"]/li[normalize-space(text())="${pnc}"]`
        );

        if (itemExistentePNC.length > 0) {
          console.log("PNC encontrado:", pnc);
          await itemExistentePNC[0].click();
          await page.waitForTimeout(2000);
          await page.keyboard.press("Enter");
        } else {
          // Se o identificador não for encontrado, clique no primeiro item da lista
          console.log(
            "PNC não encontrado. Clicando no primeiro item da lista."
          );
          const primeiroItemPNC = await page.$x(
            '//ul[@class="dropdown-list"]/li[1]'
          ); // O primeiro item real da lista está no índice 1
          await primeiroItemPNC[0].click();
          await page.waitForTimeout(2000);
          await page.keyboard.press("Enter");
        }
      } catch (error) {
        //Se entrar aqui, é porque não tem PNC
        console.log(error);
        console.log("Não foi possível encontrar o PNC");
        await page.waitForTimeout(2000);
      }
      // }

      await page.waitForTimeout(3000);
      if (tensao) {
        //Voltagem
        await page.waitForTimeout(5000);

        const voltagem = tensao;

        // Passo 1: Clique no input de voltagem para abrir o dropdown
        await page.click(
          "#main-content > ng-component > div > form > div:nth-child(4) > div:nth-child(1) > lib-elux-dropdown > div > input"
        ); // Seletor do input que abre o dropdown

        // Passo 2: Esperar o dropdown de voltagem aparecer
        await page.waitForSelector(".dropdown-list", { visible: true });

        // Passo 3: Obter todas as opções de voltagem no dropdown
        const options = await page.$$eval(".dropdown-list li", (items) =>
          items.map((item) => item.textContent.trim())
        );

        // Logar as opções encontradas para depuração
        console.log(options);

        // Passo 4: Verificar se a opção de voltagem está na lista
        const itemExistenteVolt = options.filter(
          (option) => option === voltagem
        ); // Buscando pela correspondência exata

        if (itemExistenteVolt.length > 0) {
          // Se o identificador for encontrado, clique na opção correspondente
          console.log("Opção de voltagem encontrada:", itemExistenteVolt[0]);
          const index = options.indexOf(itemExistenteVolt[0]) + 1; // Encontrar o índice do item na lista (1-based)
          const optionToClick = await page.$x(
            `//ul[@class="dropdown-list"]/li[${index}]`
          );
          await optionToClick[0].click();
          await page.waitForTimeout(2000);
          await page.keyboard.press("Enter");
        } else {
          let opção = 2;

          switch (tensao) {
            case "Bivolt":
              opção = 7;
              break;

            case "110V":
              opção = 2;
              break;

            case "127V":
              opção = 3;
              break;

            case "127v":
              opção = 3;
              break;

            case "220V":
              opção = 4;
              break;

            case "380V":
              opção = 5;
              break;

            case "440V":
              opção = 6;
              break;

            default:
              break;
          }
          console.log(
            "Opção de voltagem não encontrada. Clicando no primeiro item da lista."
          );
          // Se o identificador não for encontrado, clique no primeiro item da lista
          const primeiroItemVolt = await page.$x(
            `//ul[@class="dropdown-list"]/li[${opção}]`
          ); // O primeiro item real da lista está no índice 2
          await primeiroItemVolt[0].click();
          await page.waitForTimeout(2000);
          await page.keyboard.press("Enter");
        }
      }
      await page.waitForTimeout(6000);

      if (numeroSerie) {
        //Número de série
        await page.click(
          "#main-content > ng-component > div > form > div:nth-child(3) > div:nth-child(2) > input",
          { clickCount: 3 }
        );
        await page.waitForTimeout(2000);
        await page.type(
          "#main-content > ng-component > div > form > div:nth-child(3) > div:nth-child(2) > input",
          numeroSerie
        );
        await page.waitForTimeout(3000);
      }
      await page.waitForTimeout(3000);

      if (revendedor) {
        try {
          //Revendedor
          await page.click(
            "#main-content > ng-component > div > form > div:nth-child(4) > div:nth-child(2) > lib-elux-input-search > div > input",
            { clickCount: 3 }
          );
          await page.waitForTimeout(2000);
          await page.type(
            "#main-content > ng-component > div > form > div:nth-child(4) > div:nth-child(2) > lib-elux-input-search > div > input",
            revendedor
          );
          await page.waitForTimeout(1000);
          // Passo 2: Esperar a lista de sugestões aparecer
          await page.waitForSelector(".search-list .item-search"); // Espera até que a lista de resultados seja exibida

          // Passo 3: Selecionar a opção que corresponde à pesquisa
          await page.click(".search-list .item-search"); // Clica no primeiro item da lista
          await page.waitForTimeout(3000);
        } catch (error) {
          console.log(error);
          await page.waitForTimeout(2000);
          // teste.listagem(page, browser, arr, ++i);
        }
      }
      await page.waitForTimeout(3000);

      //Atualizar produto instalado
      await page.click(
        "#main-content > ng-component > div > div:nth-child(6) > div:nth-child(2) > div > div > div.col-3.ms-auto > lib-elux-button > button"
      );
      await teste.updateGatilhoSinistros(arr[i].id);
      await page.waitForTimeout(2000);
      teste.listagem(page, browser, arr, ++i);
      return;
    } catch (error) {
      console.log(error);
      teste.reset();
      if (browser) {
        browser.close();
      }
      return;
    }
  }

  getNomePorCategoria(categoria) {
    switch (categoria) {
      case '1':
        return 'Etiqueta';
      case '2':
        return 'Evidência de dano ou Avaria';
      case '3':
        return 'Frontal do produto';
      case '4':
        return 'Instalação do Produto';
      case '5':
        return 'Instalação Elétrica';
      case '6':
        return 'Local de Instalação';
      case '7':
        return 'Outros';
      case '8':
        return 'Peça avulsa';
      case '9':
        return 'Produto Instalado';
      case '10':
        return 'Traseira do produto';
      case '11':
        return 'Visão geral do produto';
      case '12':
        return 'Foto defeito 1';
      case '13':
        return 'Foto defeito 2';
      case '14':
        return 'OS Assinada';
      case '15':
        return 'Print Conversa Cliente';
      case '16':
        return 'Print Conversa Técnico';
      default:
        return 'imagem';
    }
  }

  async carregaOS() {
    const response = await this.acaoModel.manualQuery({
      bd: "servico_bd",
      tabela: "importados_zurich",
      query: `SELECT 
    IZ.id,
    IZ.OS,
    IZ.Sinistro,
    IZ.data,
    @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
    IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
    IZ.status,
    S.sel_nome,
    (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao',
    IZ.cod_subconjunto,
    IZ.cod_defeito,
    IZ.orientacao_consumidor,
    IZ.pnc_ml_electrolux,
    IZ.modelo_comercial,
    IZ.numero_nf,
    IZ.numero_serie,
    IZ.tensao,
    IZ.revendedor,
    IZ.modelo_usual,
    IZ.data_nf,
    IZ.taxa_flet  -- Adicionando o campo taxa_flet
FROM importados_zurich IZ
    LEFT JOIN selects S ON S.sel_id = IZ.status 
WHERE IZ.id_emp IN (101, 113)
  AND IZ.reincidencia != 4
  AND taxa_flet = 0
  AND IZ.status IN (53,69,97, 18, 72, 71, 78, 79)
  AND NOT (
      (IZ.modelo_comercial IS NULL OR TRIM(IZ.modelo_comercial) = '') AND
      (IZ.pnc_ml_electrolux IS NULL OR TRIM(IZ.pnc_ml_electrolux) = '') AND
      (IZ.numero_serie IS NULL OR TRIM(IZ.numero_serie) = '') AND
      (IZ.tensao IS NULL OR TRIM(IZ.tensao) = '') AND
      (IZ.revendedor IS NULL OR TRIM(IZ.revendedor) = '') AND
      (IZ.modelo_usual IS NULL OR TRIM(IZ.modelo_usual) = '')
  )
GROUP BY IZ.id;
`,
      tipoQuery: { type: Sequelize.SELECT },
    });

    return response[0];
  }
  async carregaID(idos) {
    var response = await axios
      .post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `select * from  classificacao_img_laudo c where c.idOs = ${idos};`,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      )
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        console.error(error);
      });
    return response;
  }

  // async carregaOS() {
  //   var response = await axios
  //     .post(
  //       "https://gsplanaltec.com/consultaBot/",
  //       {
  //         sqlQuery: `SELECT
  //             IZ.id,
  //             IZ.OS,
  //             IZ.Sinistro,
  //             IZ.data,
  //             @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
  //             IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
  //             IZ.status,
  //             S.sel_nome,
  //             (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
  //           FROM importados_zurich IZ
  //               left join selects S ON S.sel_id = IZ.status
  //           WHERE IZ.id_emp IN (101)
  //             AND IZ.gatilho = 0
  //             AND IZ.status = 53

  //           GROUP BY IZ.id`,
  //       },
  //       {
  //         //AND IZ.OS = '3713772'
  //         headers: {
  //           "Content-Type": "application/json; charset=UTF-8",
  //         },
  //       }
  //     )
  //     .then(function (response) {
  //       console.log(response);
  //       return response.data;
  //     })
  //     .catch(function (error) {
  //       console.error(error);
  //     });

  //   return response;
  // }
  removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }
  async updateGatilhoSinistros(id) {
    axios
      .post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `UPDATE importados_zurich SET taxa_flet = 1 WHERE id IN (${id})`,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      )
      .then(function (response) {
        var retorno = response.data;
        console.log(retorno);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  reset() {
    setTimeout(teste.logando, 600000);
    console.log("reset");
  }

  strFrequency(stringArr) {
    return stringArr.reduce((count, word) => {
      count[word] = (count[word] || 0) + 1;
      return count;
    }, {});
  }

  async tomaOK(page) {
    page.on("dialog", async (dialog) => {
      //get alert message
      console.log(dialog.message());
      //accept alert
      await dialog.accept();
    });
  }
}

const teste = new Vinculacao();
teste.logando();
