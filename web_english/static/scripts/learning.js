$(document).ready(function () {
  // Объявляем переменные
  let audio = new Audio(AUDIO),
    pause = false,
    stopPlay = true,
    second = 0,
    dataId = $("#text_en").attr("data-id"),
    url = "send_excerpts/" + dataId,
    punctuationsTime,
    translationMarkup,
    markupInSentance,
    sentencesEnArray,
    sentencesRuArray,
    sentenceEn = "",
    sentenceRu = "",
    wordId,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d"),
    length_sentence;
  ctx.font = "19px Times New Roman serif";
  // currentBack,
  // currentForvard;
  const INTERVAL = 2,
    CONTEINERWIDTH = 830;

  // Формируем главный текст, ищем в чанках знаки пунктуации и по ним создаем массив для дальнейшего использования при выводе предложений
  (function (url) {
    $.getJSON(url, function (result) {
      length_sentence = 0;
      for (let i = 0; i < result.excerpts_for_sending.length; i++) {
        excerpt = result.excerpts_for_sending[i];
        length_sentence += ctx.measureText(excerpt).width;
        if (length_sentence > CONTEINERWIDTH) {
          text_en.insertAdjacentHTML(
            "beforeend",
            `<br><span id=\"a${i}\" class=\"excerpt active-remove\">${excerpt}</span>`
          );
          length_sentence = ctx.measureText(excerpt).width;
        } else {
          excerpt = " " + excerpt;
          text_en.insertAdjacentHTML(
            "beforeend",
            `<span id=\"a${i}\" class=\"excerpt active-remove\">${excerpt}</span>`
          );
        }
      }
      punctuationsTime = result.punctuations_time;
      translationMarkup = result.translation_markup;
      sentencesEnArray = result.sentences_en;
      sentencesRuArray = result.sentences_ru;
      audio.currentTime = 0;
    });
  })(url);

  // Привязка подчеркивания и вывода предложений к воспроизведению аудиофайла
  (function () {
    $(audio).bind("timeupdate", function () {
      second = parseFloat(audio.currentTime);
      let chunksLength = $(".excerpt").length,
        i,
        n;
      for (i = 0; i < chunksLength; i++) {
        if (INTERVAL * i <= second && second < INTERVAL * (i + 1)) {
          break;
        }
      }
      addClasses(i);

      for (n = 0; n < punctuationsTime.length; n++) {
        if (punctuationsTime[n] <= second && second < punctuationsTime[n + 1]) {
          break;
        }
      }
      addSentences(n);
    });
  })();

  addClasses = function (count) {
    let item;
    item = document.querySelector(`#a${count}`);
    if (pause || stopPlay || $(`#a${count}`).hasClass("active")) {
      return;
    } else {
      item.classList.remove("active-remove");
      item.classList.add("active");
    }
  };

  addSentences = function (count) {
    if ($("#text-sentence-en").attr("class") !== `sentenceEn${count}`) {
      sentenceEn = "";
      sentenceRu = "";
      markupInSentance = translationMarkup.filter(
        (markup) => markup.sentence == count
      );

      for (let se = 0; se < sentencesEnArray[count].length; se++) {
        if (sentenceEn) {
          sentenceEn += `<span id=\"word${se}\" class=\"word-en\"> ${sentencesEnArray[count][se]}</span>`;
        } else {
          sentenceEn = `<span id=\"word${se}\" class=\"word-en\">${sentencesEnArray[count][se]}</span>`;
        }
      }
      let translation;
      for (let sr = 0; sr < sentencesRuArray[count].length; sr++) {
        translation = markupInSentance.find(
          (translation) => translation.in_ru == sr
        );
        if (sentenceRu) {
          if (translation) {
            sentenceRu += `<span id=\"word${translation.in_en}\" class=\"word-ru\"> ${sentencesRuArray[count][sr]}</span>`;
          } else {
            sentenceRu += `<span class=\"word-ru\"> ${sentencesRuArray[count][sr]}</span>`;
          }
        } else {
          if (translation) {
            sentenceRu = `<span id=\"word${translation.in_en}\" class=\"word-ru\">${sentencesRuArray[count][sr]}</span>`;
          } else {
            sentenceRu = `<span class=\"word-ru\">${sentencesRuArray[count][sr]}</span>`;
          }
        }
      }
      $("#text-sentence-en").replaceWith(
        `<span id=\"text-sentence-en\" class=\"sentenceEn${count}\">${sentenceEn}</span>`
      );
      $("#text-sentence-ru").replaceWith(
        `<span id=\"text-sentence-ru\" class=\"sentenceRu${count}\">${sentenceRu}</span>`
      );

      $(".word-ru").hover(function () {
        wordId = $(this).attr("id");
        $(`#${wordId}.word-en`).toggleClass("markup");
      });
      $(".word-en").hover(function () {
        wordId = $(this).attr("id");
        $(`#${wordId}.word-ru`).toggleClass("markup");
      });
    }
  };

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
    $(".excerpt.active:last").addClass("active-remove");
    $(".excerpt.active:last").removeClass("active");
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
    $(".excerpt").removeClass("active");
    $(".excerpt").removeClass("active-fast");
    $(".excerpt").addClass("active-remove");
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
//       $(".excerpt.active:last").addClass("active-remove");
//       $(".excerpt.active:last").removeClass("active");
//     } else {
//       $(".excerpt.active-fast:last").addClass("active-remove");
//       $(".excerpt.active-fast:last").removeClass("active-fast");
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
//     $(".excerpt.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//   } else if (pause) {
//     audio.currentTime += INTERVAL;
//     // if ($(".excerpt").hasClass("active-remove")) {
//     $(".excerpt.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//     // } else {
//     //   $(".excerpt:first").addClass("active-fast");
//     // };
//   } else {
//     $(".excerpt.active:last").addClass("active-fast");
//     $(".excerpt.active:last").removeClass("active");
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
