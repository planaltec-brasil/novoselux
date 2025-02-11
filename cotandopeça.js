const fs = require("fs");
const puppeteer = require("puppeteer");
const axios = require("axios");
const Sequelize = require("sequelize");
var posts = [];
const { format, addDays } = require("date-fns");
const moment = require("moment");
const clipboardy = require("node-clipboardy");

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
      headless: true,
    });

    console.log("login");
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
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
      console.log("IDOS", idos);
      console.log(arr.length);
      console.log(i);
      console.log(AG);
      console.log(OS);
      if(AG == null){
        //Atendimento sem data de AG, pulando para o próximo
        teste.listagem(page, browser, arr, ++i);
        return;
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
      console.log(horarioFormatado);
      console.log(date);
      console.log(novaData);

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

      if (
        detalhamentoValue.includes(
          "Visita realizada, estamos cotando as peças. Previsão de lançamento da análise"
        )
      ) {
        console.log("detalhamentoValue contém o conteúdo de nota");
        //Salvar
        await page.waitForTimeout(5000);
        await teste.updateGatilhoSinistros(arr[i].id);
        await page.waitForTimeout(5000);
        teste.listagem(page, browser, arr, ++i);
        return;
      } else {

        //Editar
        await page.waitForTimeout(2000);
        await page.click(
          "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(1) > lib-elux-button > button"
        );

        await page.waitForTimeout(4000);
        // Clique para abrir o dropdown de status
        await page.click(
          "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(2) > div:nth-child(4) > div > lib-elux-dropdown > div > input"
        );

        // Aguarde o dropdown carregar
        await page.waitForSelector("ul.dropdown-list");

        // Selecione a opção "Aguardando atendimento"
        const option = await page.$("ul.dropdown-list li:nth-child(23)");
        await option.click();
        

        // Aguarde a ação ser completada ou realizar outras ações que desejar
        await page.waitForTimeout(2000); // Tempo para observar

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

        //Escrevendo a nota
        var AGFormatado = AGNovo.split("-").join("/");
        await page.keyboard.type(
          `${dataFormatada} - Visita realizada, estamos cotando as peças. Previsão de lançamento da análise ${AGFormatado}.`
        );
        await page.waitForTimeout(5000);

        //Salvar
        await page.click(
          "#main-content > app-service-order-edit > div > div.row.mt-5 > div.col-3.ms-auto > lib-elux-button > button"
        );
        await page.waitForTimeout(8000);

        //Agendamento / Reagendamento
        // await page.click("#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(4) > lib-elux-button > button");
        await teste.updateGatilhoSinistros(arr[i].id);
        await page.waitForTimeout(3000)
        await teste.listagem(page, browser, arr, ++i);
        return;
      }
    } catch (error) {
      console.log(error);
      teste.reset();
      return;
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
      (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
    FROM importados_zurich IZ
        left join selects S ON S.sel_id = IZ.status 
    WHERE IZ.id_emp IN (101,113)
      AND IZ.gatilho = 0
      AND IZ.reincidencia != 4
      AND IZ.status = 166
      GROUP BY IZ.id`,
      tipoQuery: { type: Sequelize.SELECT },
    });

    return response[0];
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
