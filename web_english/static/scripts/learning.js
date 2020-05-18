$(document).ready(function () {
  let pause = false,
    stopPlay = true,
    second = 0,
    dataId = $("#text_en").attr("data-id"),
    url = "send_excerpts/" + dataId,
    item,
    excerpts,
    punctuationsTime,
    translationMarkup,
    sentencesRuArray,
    sentencesEnComposed,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  ctx.font = "19px Times New Roman serif";
  // currentBack,
  // currentForvard;
  const INTERVAL = 2,
    audio = new Audio(AUDIO),
    CONTEINERWIDTH = 830;

  (function (url) {
    $.getJSON(url, function (result) {
      excerpts = result.excerpts_for_sending;
      composeText(excerpts);
      punctuationsTime = result.punctuations_time;
      translationMarkup = result.translation_markup;
      sentencesRuArray = result.sentences_ru;
      sentencesEnComposed = result.sentences_en_composed;
      audio.currentTime = 0;
    });
  })(url);

  composeText = function (excerpts) {
    let length_sentence = 0;
    for (let i = 0; i < excerpts.length; i++) {
      excerpt = excerpts[i];
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
  };

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
      addClassesInText(i);
      for (n = 0; n < punctuationsTime.length; n++) {
        if (punctuationsTime[n] <= second && second < punctuationsTime[n + 1]) {
          break;
        }
      }
      addSentences(n);
    });
  })();

  addClassesInText = function (count) {
    if (pause || stopPlay || $(`#a${count}`).hasClass("active")) {
      return;
    } else {
      item = document.querySelector(`#a${count}`);
      item.classList.remove("active-remove");
      item.classList.add("active");
    }
  };

  addSentences = function (count) {
    let sentenceEnInHTML, sentenceRuInHTML;
    if ($("#text-sentence-en").attr("class") !== `sentenceEn${count}`) {
      sentenceEnInHTML = addExcerptInEnSentence(count);
      sentenceRuInHTML = addWordInRuSentence(count);
      replaceSentences(count, sentenceEnInHTML, sentenceRuInHTML);
      highlightWordsOnHover();
    }
  };

  replaceSentences = function (count, sentenceEnInHTML, sentenceRuInHTML) {
    $("#text-sentence-en").replaceWith(
      `<span id=\"text-sentence-en\" class=\"sentenceEn${count}\">${sentenceEnInHTML}</span>`
    );
    $("#text-sentence-ru").replaceWith(
      `<span id=\"text-sentence-ru\" class=\"sentenceRu${count}\">${sentenceRuInHTML}</span>`
    );
  };

  highlightWordsOnHover = function () {
    let wordId;
    $(".word-ru").hover(function () {
      wordId = $(this).attr("id");
      $(`#${wordId}.word-en`).toggleClass("markup");
    });
    $(".word-en").hover(function () {
      wordId = $(this).attr("id");
      $(`#${wordId}.word-ru`).toggleClass("markup");
    });
  };

  addExcerptInEnSentence = function (countSentences) {
    let sentenceEnInHTML = "",
      excerptInHTML,
      numberOfPreviousWords,
      inArray = sentencesEnComposed[countSentences]["sentence"];
    inArray["text"].forEach((excerpt, countExcerpt) => {
      numberOfPreviousWords = countPreviousWords(inArray["text"], countExcerpt);
      excerptInHTML = addEnWordInExcerpt(
        countSentences,
        countExcerpt,
        numberOfPreviousWords
      );
      if (sentenceEnInHTML) {
        sentenceEnInHTML += `<span id=\"exc${countExcerpt}\" class=\"excerpt\" data-duration=\"${inArray["durations"][countExcerpt]}\"> ${excerptInHTML}</span>`;
      } else {
        sentenceEnInHTML = `<span id=\"exc${countExcerpt}\" class=\"excerpt\" data-duration=\"${inArray["durations"][countExcerpt]}\">${excerptInHTML}</span>`;
      }
    });
    return sentenceEnInHTML;
  };

  countPreviousWords = function (inArray, countExcerpt) {
    let numberOfPreviousWords, slicedArray;
    if (countExcerpt) {
      slicedArray = inArray.slice(0, countExcerpt);
      numberOfPreviousWords = slicedArray.reduce(
        (acc, excerpt) => (acc += excerpt.length),
        0
      );
    } else {
      numberOfPreviousWords = 0;
    }
    return numberOfPreviousWords;
  };

  addEnWordInExcerpt = function (
    countSentences,
    countExcerpt,
    wordsCountBefore
  ) {
    let excerptInHTML,
      inArray =
        sentencesEnComposed[countSentences]["sentence"]["text"][countExcerpt];
    inArray.forEach((word, wordCount) => {
      if (excerptInHTML) {
        excerptInHTML += `<span id=\"word${
          wordCount + wordsCountBefore
        }\" class=\"word-en\"> ${word}</span>`;
      } else {
        excerptInHTML = `<span id=\"word${
          wordCount + wordsCountBefore
        }\" class=\"word-en\">${word}</span>`;
      }
    });
    return excerptInHTML;
  };

  addWordInRuSentence = function (countSentences) {
    let sentenceRuInHTML = "",
      translation,
      inArray = sentencesRuArray[countSentences],
      markupInSentance = translationMarkup.filter(
        (markup) => markup.sentence == countSentences
      );
    inArray.forEach((word, wordCount) => {
      translation = markupInSentance.find(
        (translation) => translation.in_ru == wordCount
      );
      if (sentenceRuInHTML) {
        if (translation) {
          sentenceRuInHTML += `<span id=\"word${translation.in_en}\" class=\"word-ru\"> ${word}</span>`;
        } else {
          sentenceRuInHTML += `<span id=\"word\" class=\"word-ru\"> ${word}</span>`;
        }
      } else {
        if (translation) {
          sentenceRuInHTML = `<span id=\"word${translation.in_en}\" class=\"word-ru\">${word}</span>`;
        } else {
          sentenceRuInHTML = `<span id=\"word\" class=\"word-ru\">${word}</span>`;
        }
      }
    });
    return sentenceRuInHTML;
  };

  playFromBeginning = function () {
    pause = false;
    stopPlay = false;
    audio.play();
    return;
  };

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

  $("#volume").change(function () {
    audio.volume = parseFloat(this.value / 10);
  });

  audio.addEventListener("ended", function () {
    setTimeout(stop_playing, 4000);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") {
      if (stopPlay || pause) {
        return;
      }
      set_pause();
    }
  });
});

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
