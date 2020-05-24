$(document).ready(function () {
  let pause = false,
    stopPlay = true,
    second = 0,
    arrayOfDurations,
    currentExcerpt,
    dataId = $("#text_en").attr("data-id"),
    url = "send_excerpts/" + dataId,
    itemT,
    itemS,
    excerptDuration,
    excerptsForText,
    punctuationsTime,
    translationMarkup,
    sentencesRuArray,
    excerptsForSentences,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  // currentBack,
  // currentForvard;
  const audio = new Audio(AUDIO),
    CONTEINERWIDTH = 830;

  (function (url) {
    $.getJSON(url, function (result) {
      excerptsForText = result.excerpts_for_text;
      punctuationsTime = result.punctuations_time;
      translationMarkup = result.translation_markup;
      sentencesRuArray = result.sentences_ru;
      excerptsForSentences = result.excerpts_for_sentences;
      arrayOfDurations = createArrayOfDurations(excerptsForText);
      audio.currentTime = 0;
      composeText();
    });
  })(url);

  createArrayOfDurations = function (excerptsForText) {
    let durations = [],
      array = excerptsForText.map((sentence) => sentence["durations"]);
    array.forEach((excerpt) => {
      durations = $.merge(durations, excerpt);
    });
    durations.forEach((duration, i) => {
      durations[i] = duration / 10;
    });
    return durations;
  };

  composeText = function () {
    ctx.font = "19px Times New Roman serif";
    let stitchLength = 0,
      numberPreviousExcerpts;
    excerptsForText.forEach((sentence, countSentences) => {
      numberPreviousExcerpts = countPreviousExcerpts(
        countSentences,
        excerptsForText
      );
      sentence.text.forEach((excerpt, countExcerpt) => {
        stitchLength += ctx.measureText(excerpt).width;
        if (stitchLength > CONTEINERWIDTH) {
          text_en.insertAdjacentHTML(
            "beforeend",
            `<br><span class=\"excerpt-text exc${
              numberPreviousExcerpts + countExcerpt
            } active-remove\" data-duration=\"${
              excerptsForText[countSentences]["durations"][countExcerpt]
            }\">${excerpt}</span>`
          );
          stitchLength = ctx.measureText(excerpt).width;
        } else {
          text_en.insertAdjacentHTML(
            "beforeend",
            `<span class=\"excerpt-text exc${
              numberPreviousExcerpts + countExcerpt
            } active-remove\" data-duration=\"${
              excerptsForText[countSentences]["durations"][countExcerpt]
            }\"> ${excerpt}</span>`
          );
        }
      });
    });
  };

  calculateExcerptTime = function (iteration) {
    let slicedArrayOfDurations = arrayOfDurations.slice(0, iteration),
      currentDuration = slicedArrayOfDurations.reduce(
        (acc, duration) => (acc += duration),
        0
      );
    return currentDuration;
  };

  (function () {
    $(audio).bind("timeupdate", function () {
      second = parseFloat(audio.currentTime);
      let excerptsLength = $(".excerpt-text").length,
        i,
        n;
      for (i = 0; i < excerptsLength; i++) {
        currentExcerpt = i;
        if (
          calculateExcerptTime(i) <= second &&
          second < calculateExcerptTime(i + 1)
        ) {
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
    if (
      pause ||
      stopPlay ||
      $(`.exc${count}`).hasClass("active") ||
      !$(".excerpt-sentence").hasClass(`exc${count}`)
    ) {
      return;
    } else {
      itemT = document.querySelector(`.excerpt-text.exc${count}`);
      excerptDuration = $(`.excerpt-text.exc${count}`).attr("data-duration");
      itemT.classList.remove("active-remove");
      itemT.classList.add(`active${excerptDuration}`);
      itemS = document.querySelector(`.excerpt-sentence.exc${count}`);
      itemS.classList.remove("active-remove");
      itemS.classList.add(`active${excerptDuration}`);
    }
  };

  addSentences = function (count) {
    let sentenceEnInHTML, sentenceRuInHTML;
    if ($("#text-sentence-en").attr("class") !== `sentenceEn${count}`) {
      sentenceEnInHTML = addExcerptInEnSentence(count);
      sentenceRuInHTML = addWordInRuSentence(count);
      replaceSentences(count, sentenceEnInHTML, sentenceRuInHTML);
      highlightWordsOnHover();
      showTranslateWordOnClick();
    }
  };

  addExcerptInEnSentence = function (countSentences) {
    ctx.font = "25px Times New Roman serif";
    let sentenceEnInHTML = "",
      excerptInHTML,
      textOfExcerpts,
      stitchLength = 0,
      numberOfPreviousWords,
      numberPreviousExcerpts,
      inArray = excerptsForSentences[countSentences];
    numberPreviousExcerpts = countPreviousExcerpts(
      countSentences,
      excerptsForSentences
    );
    inArray["text"].forEach((excerpt, countExcerpt) => {
      numberOfPreviousWords = countPreviousWords(inArray["text"], countExcerpt);
      excerptInHTML = addEnWordInExcerpt(
        countSentences,
        countExcerpt,
        numberOfPreviousWords
      );
      textOfExcerpts = $(`.exc${countExcerpt + numberPreviousExcerpts}`).text();
      stitchLength += ctx.measureText(textOfExcerpts).width;
      if (!sentenceEnInHTML) {
        sentenceEnInHTML = `<span class=\"excerpt-sentence exc${
          countExcerpt + numberPreviousExcerpts
        } active-remove\">${excerptInHTML}</span>`;
      } else if (stitchLength < CONTEINERWIDTH) {
        sentenceEnInHTML += `<span class=\"excerpt-sentence exc${
          countExcerpt + numberPreviousExcerpts
        } active-remove\"> ${excerptInHTML}</span>`;
      } else {
        sentenceEnInHTML += `<br><span class=\"excerpt-sentence exc${
          countExcerpt + numberPreviousExcerpts
        } active-remove\">${excerptInHTML}</span>`;
        stitchLength = ctx.measureText(textOfExcerpts).width;
      }
    });
    return sentenceEnInHTML;
  };

  countPreviousExcerpts = function (countSentences, excerpts) {
    let numberOfPreviousExcerpts, slicedArray;
    if (countSentences) {
      slicedArray = excerpts.slice(0, countSentences);
      numberOfPreviousExcerpts = slicedArray.reduce(
        (acc, sentence) => (acc += sentence["text"].length),
        0
      );
    } else {
      numberOfPreviousExcerpts = 0;
    }
    return numberOfPreviousExcerpts;
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
      inArray = excerptsForSentences[countSentences]["text"][countExcerpt];
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

  replaceSentences = function (count, sentenceEnInHTML, sentenceRuInHTML) {
    $("#text-sentence-en").replaceWith(
      `<span id=\"text-sentence-en\" class=\"sentenceEn${count}\">${sentenceEnInHTML}</span>`
    );
    $("#text-sentence-ru").replaceWith(
      `<span id=\"text-sentence-ru\" class=\"sentenceRu${count}\">${sentenceRuInHTML}</span>`
    );
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

  showTranslateWordOnClick = function () {
    let wordText;
    $(".word-en").click(function () {
      wordText = $(this)
        .text()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      $.getJSON(`/send_word/${wordText}`, function (result) {
        alert(result);
      });
    });
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
    let currentDuration = calculateExcerptTime(currentExcerpt);
    if (stopPlay) {
      return;
    }
    pause = true;
    stopPlay = false;
    audio.pause();
    // 2.5 - это чуть больше одного обновления timeupdate (чтобы не было деления на 0)
    if (audio.currentTime > 2.5) {
      currentBack = audio.currentTime - (audio.currentTime % currentDuration);
    } else {
      currentBack = 0;
    }
    audio.currentTime = currentBack;
    $(
      `.excerpt-text.exc${currentExcerpt}.active${excerptDuration}:last`
    ).addClass("active-remove");
    $(
      `.excerpt-text.exc${currentExcerpt}.active${excerptDuration}:last`
    ).removeClass(`active${excerptDuration}`);
    $(
      `.excerpt-sentence.exc${currentExcerpt}.active${excerptDuration}:last`
    ).addClass("active-remove");
    $(
      `.excerpt-sentence.exc${currentExcerpt}.active${excerptDuration}:last`
    ).removeClass(`active${excerptDuration}`);
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
    let countCSSClasses = 10,
      multiplicityCSSClasses = 2;
    stopPlay = true;
    pause = false;
    audio.pause();
    audio.currentTime = 0;

    for (let y = 0; y <= countCSSClasses; y++) {
      $(".excerpt-text").removeClass(`active${y * multiplicityCSSClasses}`);
      $(".excerpt-sentence").removeClass(`active${y * multiplicityCSSClasses}`);
    }
    $(".excerpt-text").removeClass("active-fast");
    $(".excerpt-text").addClass("active-remove");
    $(".excerpt-sentence").removeClass("active-fast");
    $(".excerpt-sentence").addClass("active-remove");
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
//     audio.currentTime -= duration;
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
//     audio.currentTime += duration;
//     // $(".active-remove:first").addClass("active-fast") ||
//     $(".excerpt.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//   } else if (pause) {
//     audio.currentTime += duration;
//     // if ($(".excerpt").hasClass("active-remove")) {
//     $(".excerpt.active-remove:first").addClass("active-fast");
//     $(".active-remove:first").removeClass("active-remove");
//     // } else {
//     //   $(".excerpt:first").addClass("active-fast");
//     // };
//   } else {
//     $(".excerpt.active:last").addClass("active-fast");
//     $(".excerpt.active:last").removeClass("active");
//     currentForvard = duration - (audio.currentTime % duration);
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
