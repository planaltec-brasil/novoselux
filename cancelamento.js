const fs = require("fs");
const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");
const axios = require("axios");
const Sequelize = require("sequelize");
const path = require("path");
const https = require("https");
var posts = [];
var arquivos;
const { format, addDays } = require("date-fns");
const moment = require("moment");
const clipboardy = require("node-clipboardy");
const diretorio = path.join(__dirname); // Caminho do diretório com as fotos

const opcoes = [
  "Abertura indevida",
  "Aguardando consumidor levar produto no SAE",
  "Solicitado pelo Consumidor - Desistência de Reparo",
  "Endereço não localizado",
  "Não troca peça",
  "Orçamento não aprovado",
  "Orientação",
  "Peça obsoleta",
  "Produto voltou a funcionar / sem defeito",
  "Sem contato com o consumidor",
  "Serviço realizado",
  "Solicitado pelo consumidor - Agendamento muito distante",
  "Solicitado pelo Consumidor - Desistência de Reparo",
  "Solicitado pelo consumidor - Indisponibilidade de agenda",
  "Solicitado pelo consumidor - Local não preparado",
  "Solicitado pelo consumidor - Produto não está com consumidor",
  "Solicitado pelo consumidor - Valor taxa de visita/deslocamento",
];


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

var iDados = 0;
let dados = [];
let json = {};

class Vinculacao {
  acaoModel = require("../../../acaoModel/acaoModel");
  constructor() {
    this.acaoModel = new this.acaoModel();
  }

  async logando(i = 0, arr = []) {
    const browser = await puppeteer.launch({
      headless: false,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 720 });
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

  // Função para normalizar o texto
  normalizaTexto(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ");
  }

  async listagem(page, browser, arr = [], i = 0) {
    try {
      console.log(arr);
      await page.waitForTimeout(5000);
      let OS = arr[i].OS;
      let AG = arr[i].AG;
      let idos = arr[i].id;
      let obsGS = arr[i].descricao;
      console.log(obsGS);
      // Expressão regular para encontrar o texto entre <b> e </b>
      let regex = /<b>(.*?)<\/b>/g;
      let match;

      // Extrair todos os motivos encontrados dentro das tags <b>
      let motivos = [];
      while ((match = regex.exec(obsGS)) !== null) {
        motivos.push(match[1]);
      }
      let motivo;
      // Primeiro, verifica se existe o segundo elemento
      if (motivos.length > 1) {
        motivo = motivos[1];
        motivo = motivo.replace("Motivo: ", "").trim();
        console.log(motivo);
      } else {
        // Caso não exista, pode usar o primeiro elemento ou definir um valor padrão
        motivo = motivos[0] || "Motivo não encontrado";
        motivo = motivo.replace("Motivo: ", "").trim();
        console.log(motivo);
      }

      const mapeamento = {
        "erro de instalacao": "Orientação",
        "sem possibilidade de analise": "Endereço não localizado",
        "erro instalacao": "Orientação",
        "erro de sistema": "Abertura indevida",
        "erro no sistema": "Abertura indevida",
        "falta de contato": "Sem contato com o consumidor",
        "sem contato": "Sem contato com o consumidor",
        "falta de documentacao": "Sem contato com o consumidor",
        "falta doc": "Sem contato com o consumidor",
        "os duplicada": "Abertura indevida",
        "ordem duplicada": "Abertura indevida",
        "produto voltar a funcionar": "Produto voltou a funcionar",
        "produto funcionando": "Produto voltou a funcionar",
        "regiao de dificil acesso": "Endereço não localizado",
        "dificil acesso": "Endereço não localizado",
        "reparado por outra at": "Abertura indevida",
        "reparado por terceiros": "SOrientação",
        "sem analise possivel": "Orientação",
        "impossivel analisar": "Orientação",
        "sem tecnico na regiao": "Endereço não localizado",
        "falta tecnico": "Endereço não localizado",
        "solicitou cancelamento":
          "Solicitado pelo Consumidor - Desistência de Reparo",
        "pediu cancelar": "Solicitado pelo Consumidor - Desistência de Reparo",
        "cliente sem nota fiscal":
          "Solicitado pelo consumidor - Local não preparado",
        "falta nf": "Solicitado pelo consumidor - Local não preparado",
        "decisao electrolux":
          "Solicitado pelo consumidor - Agendamento muito distante",
        "cliente nao aceita visita":
          "Solicitado pelo Consumidor - Desistência de Reparo",
        "recusa visita": "Solicitado pelo Consumidor - Desistência de Reparo",
      };

      // Busca correspondência
      let motivoNormalizado = teste.normalizaTexto(motivo);
      let opcaoSelecionada2 = Object.keys(mapeamento).find((m) =>
        motivoNormalizado.includes(teste.normalizaTexto(m))
      );

      if (opcaoSelecionada2) {
        console.log("Opção encontrada:", mapeamento[opcaoSelecionada2]);
      } else {
        console.log("Nenhuma correspondência encontrada para:", motivo);
        // await teste.listagem(page, browser, arr, ++i);
        return;
      }

      console.log("IDOS", idos);
      console.log(arr.length);
      console.log(i);
      console.log(AG);
      console.log(OS);
      if (AG == null) {
        AG = "01/01/2024";
      }
      var AGNovo = AG.split("/").join("-");
      console.log(AGNovo);
      const AGDate = new Date(AGNovo.split("-").reverse().join("-"));
      const today = new Date();

      // Remove time portion for accurate date comparison
      today.setHours(0, 0, 0, 0);
      AGDate.setHours(0, 0, 0, 0);

      if (AGDate < today) {
        // Add 3 days if date is in the past
        let newDate = addDays(today, 3);

        // Check if the new date is Sunday (0 = Sunday)
        if (newDate.getDay() === 0) {
          // If Sunday, add one more day to move to Monday
          newDate = addDays(newDate, 1);
        }

        AGNovo = format(newDate, "dd-MM-yyyy");
      }
      console.log("Data atualizada", AGNovo);
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
      //   console.log(horarioFormatado);
      //   console.log(date);
      //   console.log(novaData);

      //Ordens de Serviço
      await page.waitForSelector("body > app-root > app-portal > app-header > app-menu > div > div > div.d-none.d-md-flex.container.align-items-center.nav-container > a > span")
      await page.click("body > app-root > app-portal > app-header > app-menu > div > div > div.d-none.d-md-flex.container.align-items-center.nav-container > a > span");
      await page.waitForTimeout(4000);
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
        arr[i].OS
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

        await page.waitForTimeout(6000);  // Espera 6 segundos
      } catch (error) {
        console.log("Sinistro não encontrado.");
        console.error(error);  // Log mais detalhado para entender o erro
        teste.listagem(page, browser, arr, ++i);
        return;
      }
      await page.waitForTimeout(6000);

      // Obtém o conteúdo do seletor usando o Puppeteer
      const detalhamentoValue = await page.$eval(
        "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(5) > div:nth-child(2) > div:nth-child(2) > span",
        (element) => element.textContent.trim()
      );

      console.log(detalhamentoValue); // Exibe o conteúdo no console

      try {


        const idData = await this.carregaID(idos);
        console.log(idData[0]);
        if (idData[0] != undefined) {
          //Sinistro com fotos
          await page.waitForTimeout(3000);

          let fotoev_1 = idData[0].fotoev_1;
          let fotoev_3 = idData[0].fotoev_3;
          let fotoev_4 = idData[0].fotoev_4;
          let fotoev_5 = idData[0].fotoev_5;
          let fotoev_6 = idData[0].fotoev_6;
          let fotoev_7 = idData[0].fotoev_7;
          let fotoev_8 = idData[0].fotoev_8;
          // Se algum valor de foto for null, substitua por uma string vazia
          const fotos = [
            fotoev_1,
            fotoev_3,
            fotoev_4,
            fotoev_5,
            fotoev_6,
            fotoev_7,
            fotoev_8,
          ].map((foto) => (foto == null ? "" : foto));

          // Agora, remova quaisquer strings vazias da lista de arquivos
          arquivos = fotos.filter((foto) => foto !== "");

          // Só faça o download se houver arquivos válidos
          for (const arquivo of arquivos) {
            const url = getFile(arquivo);
            if (url) {
              const nomeArquivoLocal = path.basename(arquivo);
              await downloadFile(url, nomeArquivoLocal);
            }
          }

          // 3. Iterar sobre os arquivos válidos e fazer o upload
          for (const arquivo of arquivos) {
            //Novo Anexo
            await page.waitForSelector(
              "#main-content > ng-component > div > div:nth-child(4) > app-attachment-section > div:nth-child(2) > div.col-3.button-container > lib-elux-button > button"
            );
            await page.click(
              "#main-content > ng-component > div > div:nth-child(4) > app-attachment-section > div:nth-child(2) > div.col-3.button-container > lib-elux-button > button"
            );
            await page.waitForTimeout(4000);

            // Esperar até que o botão de upload esteja disponível
            await page.waitForSelector("button.elux-button");
            // await page.click("button.elux-button");

            // Espera até o campo de entrada de arquivo aparecer
            const inputFileSelector = 'input[type="file"]';
            await page.waitForSelector(inputFileSelector);

            const filePath = path.join(__dirname, arquivo);

            // Faz o upload do arquivo
            const inputFile = await page.$(inputFileSelector); // Localiza o input de arquivos
            await inputFile.uploadFile(filePath); // Faz o upload do arquivo

            console.log(`Imagem ${arquivo} anexada com sucesso!`);

            // Aguarde um tempo entre uploads para evitar sobrecarga no servidor (opcional)
            await page.waitForTimeout(2000); // Aguarda 2 segundos antes de enviar o próximo arquivo (ajuste conforme necessário)
            //Concluir
            await page.waitForTimeout(3000);
            await page.click(
              "#main-content > app-attachment-create > div > div:nth-child(9) > div > lib-elux-button > button"
            );
            await page.waitForTimeout(2000);
          }
          // await page.keyboard.press('Escape');
          console.log("Todos os arquivos foram anexados com sucesso!");

          // 4. Apagar os arquivos após o upload
          for (const arquivo of arquivos) {
            const filePath = path.join(__dirname, arquivo); // Caminho completo do arquivo

            // Verifique se o arquivo existe antes de tentar apagar
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Erro ao tentar apagar o arquivo ${arquivo}:`, err);
              } else {
                console.log(`Arquivo ${arquivo} apagado com sucesso!`);
              }
            });
          }
        }
      } catch (error) {
        if (error == "Error: Erro ao baixar o arquivo.") {
          await page.waitForTimeout(3000)
          // 4. Apagar os arquivos após o upload
          for (const arquivo of arquivos) {
            const filePath = path.join(__dirname, arquivo); // Caminho completo do arquivo

            // Verifique se o arquivo existe antes de tentar apagar
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Erro ao tentar apagar o arquivo ${arquivo}:`, err);
              } else {
                console.log(`Arquivo ${arquivo} apagado com sucesso!`);
              }
            });
          }
          // await teste.listagem(page, browser, arr, ++i);
          // return;
        }
      }
      //Editar
      await page.waitForTimeout(2000);
      await page.waitForSelector(
        "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(1) > lib-elux-button > button"
      );

      await page.click(
        "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(1) > lib-elux-button > button"
      );

      await page.waitForTimeout(4000);

      if (detalhamentoValue == "-") {
        //Detalhamento do serviço Realizado
        await page.waitForTimeout(2000);
        await page.click(
          "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(26) > div:nth-child(5) > div > textarea"
        );

        //Em detalhamento do serviço realizado
        await page.waitForTimeout(5000);

        console.log("Texto não encontrado");
        await page.keyboard.down('Control'); // Pressiona o "Control"
        await page.keyboard.press('A');      // Pressiona "A"
        await page.keyboard.up('Control');   // Solta o "Control"
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
        await page.keyboard.type(motivo);
        await page.waitForTimeout(4000);
      }

      // Clique para abrir o dropdown de status
      await page.click(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(2) > div:nth-child(4) > div > lib-elux-dropdown > div > input"
      );

      // Aguarde o dropdown carregar
      await page.waitForSelector("ul.dropdown-list");

      // Selecione a opção "Aguardando atendimento"
      const optionStatus = await page.$("ul.dropdown-list li:nth-child(17)");
      await optionStatus.click();

      // Aguarde a ação ser completada ou realizar outras ações que desejar
      await page.waitForTimeout(6000); // Tempo para observar

      // Clique para abrir o dropdown (substitua o seletor pelo seletor correto para abrir o dropdown)
      await page.click(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(2) > div:nth-child(4) > div:nth-child(2) > lib-elux-dropdown > div"
      );

      // Supondo que mapeamento[opcaoSelecionada2] é algo como "Solicitado pelo Consumidor - Desistência de Reparo"
      const opcaoSelecionada = mapeamento[opcaoSelecionada2];
      console.log("Opção", opcaoSelecionada);
      // Esperar as opções carregarem
      await page.waitForTimeout(3000); // Ajuste o tempo conforme necessário
      await page.waitForSelector(".dropdown-list", { visible: true }); // Aguarda a lista estar visível
      await page.waitForTimeout(3000); // Ajuste o tempo conforme necessário
      // Aguarde o dropdown carregar
      await page.waitForSelector("ul.dropdown-list");

      // Obtenha todas as opções do dropdown
      const listaOpcoes = await page.$$eval("ul.dropdown-list li", (items) =>
        items.map((item) => item.textContent.trim())
      );
      console.log(listaOpcoes);
      // Encontre o índice da opção com base na string de texto
      const indice = listaOpcoes.indexOf(opcaoSelecionada);
      console.log(indice);
      // Se a opção for encontrada
      if (indice !== -1) {
        // Como o índice é 0-based, somamos 1 para usar com nth-child, que é 1-based
        const optionStatus = await page.$(
          `ul.dropdown-list li:nth-child(${indice + 1})`
        );

        // Clique na opção selecionada
        if (optionStatus) {
          await optionStatus.click();
        } else {
          console.log("Opção não encontrada!");
        }
      } else {
        console.log("Texto da opção não encontrado!");
      }

      await page.waitForTimeout(6000);

      //Data Inicio do Atendimento
      await page.type(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(23) > div:nth-child(3) > div:nth-child(1) > lib-elux-datepicker > div > input",
        dataFormatada
      );
      await page.waitForTimeout(3000);

      //Data final do atendimento
      await page.type(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(23) > div:nth-child(4) > div:nth-child(1) > lib-elux-datepicker > div > input",
        dataFormatada
      );
      await page.waitForTimeout(3000);

      //Hora inicio e Final do atendimento
      await page.type(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(23) > div:nth-child(3) > div:nth-child(2) > input",
        "09:00"
      );
      await page.waitForTimeout(1000);
      await page.type(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(23) > div:nth-child(4) > div:nth-child(2) > input",
        "11:00"
      );

      await page.waitForTimeout(3000);

      //Orientação dada ao Consumidor
      await page.click(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(26) > div:nth-child(3) > div > lib-elux-dropdown > div"
      );
      await page.waitForTimeout(3000);

      // Selecione a opção "Aguardando atendimento"
      const option = await page.$("ul.dropdown-list li:nth-child(4)");
      await option.click();

      // Aguarde alguns segundos para garantir que a seleção foi realizada
      await page.waitForTimeout(2000);

      //Resumo para Consumidor
      await page.click(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(26) > div:nth-child(4) > div > textarea",
        { clickCount: 3 }
      );
      await page.waitForTimeout(1000);
      if (detalhamentoValue == "-") {
        await page.type(
          "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(26) > div:nth-child(4) > div > textarea",
          motivo
        );
      } else {
        await page.type(
          "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(26) > div:nth-child(4) > div > textarea",
          detalhamentoValue
        );
      }
      await page.waitForTimeout(2000);

      //Salvar
      await page.click(
        "#main-content > app-service-order-edit > div > div.row.mt-5 > div.col-3.ms-auto > lib-elux-button > button"
      );
      await page.waitForTimeout(4000);
      await teste.updateStatusSinistros(idos, dataFormatada, horarioFormatado);
      await teste.listagem(page, browser, arr, ++i);
      return;
    } catch (error) {
      console.log(error);
      if (browser) {
        browser.close()
      }
      await teste.reset();
      return;
    }
    return;
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
      (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
    FROM importados_zurich IZ
        left join selects S ON S.sel_id = IZ.status 
    WHERE IZ.id_emp IN (144,101)
      AND IZ.gatilho = 0
      AND IZ.reincidencia != 4
      AND IZ.status = 138
      GROUP BY IZ.id`,
      tipoQuery: { type: Sequelize.SELECT },
    });

    return response[0];
  }

  async updateStatusSinistros(id, dataFormatada, horarioFormatado) {
    console.log(id);
    console.log(dataFormatada);
    console.log(horarioFormatado);

    const descricao = `Mudanças de: Suporte - Status Atualizado de AGUARDANDO CANCELAMENTO para CANCELADO | <b></b>;`;
    try {
      // Atualiza o status
      await axios.post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `
            UPDATE importados_zurich 
            SET status = 50, AtivoInativo = 2 
            WHERE id IN (${id});
          `,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );
      console.log("Status atualizado com sucesso");

      // Inserir a descrição após o update
      await axios.post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `
            INSERT INTO descricoes (desc_id_zurich, desc_descricao, desc_data, desc_hora)
            VALUES (${id}, "${descricao}", "${dataFormatada}", "${horarioFormatado}");
          `,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );
      console.log("Descrição inserida com sucesso");
      return;
    } catch (error) {
      console.error("Erro ao atualizar status e inserir descrição:", error);
    }
  }

  async carregaID(idos) {
    var response = await axios
      .post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `SELECT 
                      idos, 
                      fotoev_1, 
                      fotoev_3, 
                      fotoev_4,
                      fotoev_5,
                      fotoev_6,
                      fotoev_7,
                      fotoev_8
                      FROM 
                      assistencia 
                    WHERE idos = ${idos}`,
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
          sqlQuery: `UPDATE importados_zurich SET gatilho = 1 WHERE id IN (${id})`,
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
