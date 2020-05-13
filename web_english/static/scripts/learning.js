$(document).ready(function () {
  // Объявляем переменные
  let audio = new Audio(AUDIO),
    pause = false,
    stopPlay = true,
    second = 0,
    dataId = $("#text_en").attr("data-id"),
    url = "send_chunks/" + dataId,
    pointsTime = [0],
    sentencesEnArray,
    sentencesRuArray,
    sentenceEn = "",
    sentenceRu = "",
    pointInChunk,
    pointInText,
    punctuation,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d"),
    length_sentence;
  ctx.font = "19px Times New Roman serif";
  // currentBack,
  // currentForvard;
  const INTERVAL = 2;

  // Формируем главный текст, ищем в чанках знаки пунктуации и по ним создаем массив для дальнейшего использования при выводе предложений
  (function (url) {
    $.getJSON(url, function (result) {
      let length_sentence = 0;
      for (let i = 0; i < result.chunks_for_sending.length; i++) {
        chunk = result.chunks_for_sending[i];
        length_sentence += ctx.measureText(chunk).width;
        // Ширина контейнера 900 => длина предложения должна быть не больше примерно 830
        if (length_sentence > 830) {
          text_en.insertAdjacentHTML(
            "beforeend",
            `<br><span id=\"a${i}\" class=\"chunk active-remove\">${chunk}</span>`
          );
          length_sentence = ctx.measureText(chunk).width;
        } else {
          chunk = " " + chunk;
          text_en.insertAdjacentHTML(
            "beforeend",
            `<span id=\"a${i}\" class=\"chunk active-remove\">${chunk}</span>`
          );
        }

        if (
          chunk.indexOf(".") != -1 ||
          chunk.indexOf("!") != -1 ||
          chunk.indexOf("?") != -1 ||
          chunk.indexOf(";") != -1
        ) {
          punctuation = punctuationIndexes(chunk);
          for (let p of punctuation) {
            pointInChunk = (INTERVAL / chunk.length) * p;
            pointInText = INTERVAL * i + pointInChunk;
            pointsTime.push(pointInText);
          }
        }
      }
      sentencesEnArray = result.sentences_en;
      sentencesRuArray = result.sentences_ru;
      audio.currentTime = 0;
    });
  })(url);

  // Вспомогательная функция для формирования массива с индексами знаков пунктуации
  function punctuationIndexes(chunk) {
    let punctuationIndexes = [];
    let searchElement = [".", "!", "?", ";"];
    let index;
    for (let i of searchElement) {
      index = chunk.indexOf(i);
      while (index != -1) {
        punctuationIndexes.push(index);
        index = chunk.indexOf(i, index + 1);
      }
    }
    return punctuationIndexes;
  }

  // Привязка подчеркивания и вывода предложений к воспроизведению аудиофайла
  (function () {
    $(audio).bind("timeupdate", function () {
      second = parseFloat(audio.currentTime);
      let chunksLength = $(".chunk").length,
        item,
        i,
        n;
      for (i = 0; i < chunksLength; i++) {
        if (INTERVAL * i <= second && second < INTERVAL * (i + 1)) {
          break;
        }
      }
      addClasses(i);

      for (n = 0; n < pointsTime.length; n++) {
        if (pointsTime[n] <= second && second < pointsTime[n + 1]) {
          break;
        }
      }
      addSentences(n);
    });
  })();

  addClasses = function (count) {
    item = document.querySelector(`#a${count}`);
    if (pause || stopPlay || $(`#a${count}`).hasClass("active")) {
      return;
    } else {
      item.classList.remove("active-remove");
      item.classList.add("active");
    }
  };

  addSentences = function (count) {
    // let sentenceEn = "";
    // let sentenceRu = "";

    for (let se = 0; se < sentencesEnArray[count].length; se++) {
      if (sentenceEn) {
        sentenceEn += `<span id=\"word${se}\" class=\"wordsEn\"> ${sentencesEnArray[count][se]}</span>`;
      } else {
        sentenceEn = `<span id=\"word${se}\" class=\"wordsEn\">${sentencesEnArray[count][se]}</span>`;
      }
    }

    for (let sr = 0; sr < sentencesRuArray[count].length; sr++) {
      if (sentenceRu) {
        sentenceRu += `<span id=\"word${sr}\" class=\"wordsRu\"> ${sentencesRuArray[count][sr]}</span>`;
      } else {
        sentenceRu = `<span id=\"word${sr}\" class=\"wordsRu\">${sentencesRuArray[count][sr]}</span>`;
      }
    }

    if ($("#text-sentence-en").attr("class") !== `sentenceEn${count}`) {
      $("#text-sentence-en").replaceWith(
        `<span id=\"text-sentence-en\" class=\"sentenceEn${count}\">${sentenceEn}</span>`
      );
    }

    if ($("#text-sentence-ru").attr("class") !== `sentenceRu${count}`) {
      $("#text-sentence-ru").replaceWith(
        `<span id=\"text-sentence-ru\" class=\"sentenceRu${count}\">${sentenceRu}</span>`
      );
    }
  };
  // addSentences = function (count) {
  //   if ($("#text-sentence-en").text() !== sentencesEnArray[count]) {
  //     $("#text-sentence-en").replaceWith(
  //       `<span id=\"text-sentence-en\">${sentencesEnArray[count]}</span>`
  //     );
  //   }

  //   if ($("#text-sentence-ru").text() !== sentencesRuArray[count]) {
  //     $("#text-sentence-ru").replaceWith(
  //       `<span id=\"text-sentence-ru\">${sentencesRuArray[count]}</span>`
  //     );
  //   }
  // };

  // Play
  playFromBeginning = function () {
    pause = false;
    stopPlay = false;
    audio.play();
    return;
  };

  // Возобновление воспроизведения после паузы
  resumePlaying = function () {
    if (stopPlay) {
      return;
    }
    pause = false;
    audio.play();
    return;
  };

  playButtonHandler = function () {
    if (!pause) {
      playFromBeginning();
    } else {
      resumePlaying();
    }
    return;
  };

  document.getElementById("play").addEventListener("click", playButtonHandler);

  // Пауза (возвращает на ближий интервал в 2 секунды) ДОРАБОТАТЬ!
  set_pause = function () {
    if (stopPlay) {
      return;
    }
    pause = true;
    stopPlay = false;
    audio.pause();
    currentBack = audio.currentTime - (audio.currentTime % INTERVAL);
    audio.currentTime = currentBack;
    $(".chunk.active:last").addClass("active-remove");
    $(".chunk.active:last").removeClass("active");
    return;
  };

  pauseButtonHandler = function () {
    if (!pause) {
      set_pause();
    } else {
      resumePlaying();
    }
    return;
  };

  document
    .getElementById("pause")
    .addEventListener("click", pauseButtonHandler);

  // Stop
  stop_playing = function () {
    stopPlay = true;
    pause = false;
    audio.pause();
    audio.currentTime = 0;
    $(".chunk").removeClass("active");
    $(".chunk").removeClass("active-fast");
    $(".chunk").addClass("active-remove");
    return;
  };

  stopButtonHandler = function () {
    stop_playing();
    return;
  };

  document.getElementById("stop").addEventListener("click", stopButtonHandler);

  // Громкость
  $("#volume").change(function () {
    audio.volume = parseFloat(this.value / 10);
  });

  // Возврат к началу при завершении воспроизведения
  audio.addEventListener("ended", function () {
    setTimeout(stop_playing, 4000);
  });

  // Пауза при сворачивании окна
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") {
      if (stopPlay || pause) {
        return;
      }
      set_pause();
    }
  });
});
// Прогресс
//   (function () {
//     $(audio).bind("timeupdate", function () {
//       let s = parseInt(audio.currentTime % 60);
//       let m = parseInt(audio.currentTime / 60) % 60;
//       if (s < 10) {
//         s = "0" + s;
//       }
//       $("#duration").html(`${m}:${s}`);
//       let value = 0;
//       if (audio.currentTime > 0) {
//         value = Math.floor((100 / audio.duration) * audio.currentTime);
//       }
//       $("#progress").css("width", value + "%");
//     });
//   })();

// // Вернуть на 3 секунды назад, либо пауза
// set_back = function () {
//   if (stopPlay) {
//     return;
//   } else if (pause) {
//     audio.currentTime -= INTERVAL;
//     if ($(".active-remove:first").prev(".active")) {
//       $(".chunk.active:last").addClass("active-remove");
//       $(".chunk.active:last").removeClass("active");
//     } else {
//       $(".chunk.active-fast:last").addClass("active-remove");
//       $(".chunk.active-fast:last").removeClass("active-fast");
//     }
//   } else {
//     set_pause();
//   }
// };

// // Вперед на 3 секунды либо на ближайший следующий интервал в 3 секунды
// set_forvard = function () {
//   if (stopPlay) {
//     stopPlay = false;
//     pause = true;
//     audio.currentTime += INTERVAL;
//     // $(".active-remove:first").addClass("active-fast") ||
//     $(".chunk.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//   } else if (pause) {
//     audio.currentTime += INTERVAL;
//     // if ($(".chunk").hasClass("active-remove")) {
//     $(".chunk.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//     // } else {
//     //   $(".chunk:first").addClass("active-fast");
//     // };
//   } else {
//     $(".chunk.active:last").addClass("active-fast");
//     $(".chunk.active:last").removeClass("active");
//     currentForvard = INTERVAL - (audio.currentTime % INTERVAL);
//     audio.currentTime += currentForvard;
//     // $(".active-remove:first").prev(".active").addClass("active-fast");
//     // $(".active-remove:first").prev(".active").removeClass("active");
//   }
// };

// backButtonHandler = function () {
//   set_back();
//   return;
// };

// forvardButtonHandler = function () {
//   set_forvard();
//   return;
// };

// document
//   .getElementById("back")
//   .addEventListener("click", backButtonHandler);

// document
//   .getElementById("forvard")
//   .addEventListener("click", forvardButtonHandler);
