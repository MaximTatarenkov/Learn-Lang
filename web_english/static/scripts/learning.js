$(document).ready(function () {
  let pause = false,
    stopPlay = true,
    currentTimeAudio = 0,
    currentExcerpt = 0,
    sentenceCount,
    excerptDuration,
    excerptsForText,
    punctuationsTime,
    translationMarkup,
    sentencesRuArray,
    excerptsForSentences,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  const audio = new Audio(AUDIO),
    CONTEINERWIDTH = 830;

  (function () {
    let dataId = $("#text_en").attr("data-id"),
      url = "send_excerpts/" + dataId;
    $.getJSON(url, function (result) {
      excerptsForText = result.excerpts_for_text;
      excerptsForSentences = result.excerpts_for_sentences;
      punctuationsTime = result.punctuations_time;
      translationMarkup = result.translation_markup;
      sentencesRuArray = result.sentences_ru;
      audio.currentTime = 0;
      composeText();
    });
  })();

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
      sentenceHTML,
      numberPreviousExcerpts;
    excerptsForText.forEach((sentence, countSentences) => {
      numberPreviousExcerpts = countPreviousExcerpts(
        countSentences,
        excerptsForText
      );
      text_en.insertAdjacentHTML(
        "beforeend",
        `<a id=\"sentence${countSentences}\" class=\"sentence-in-text\" href=\"#\"></a>`
      );
      sentence.text.forEach((excerpt, countExcerpt) => {
        sentenceHTML = document.getElementById(`sentence${countSentences}`);
        stitchLength += ctx.measureText(excerpt).width;
        if (stitchLength > CONTEINERWIDTH) {
          sentenceHTML.insertAdjacentHTML(
            "beforeend",
            `<br><span class=\"excerpt-text exc${
              numberPreviousExcerpts + countExcerpt
            } active-remove\" data-duration=\"${
              excerptsForText[countSentences]["durations"][countExcerpt]
            }\">${excerpt}</span>`
          );
          stitchLength = ctx.measureText(excerpt).width;
        } else {
          sentenceHTML.insertAdjacentHTML(
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
    movingOnToSentence();
  };

  calculateExcerptTime = function (iteration) {
    let arrayOfDurations = createArrayOfDurations(excerptsForText),
      slicedArrayOfDurations = arrayOfDurations.slice(0, iteration),
      currentDuration = slicedArrayOfDurations.reduce(
        (acc, duration) => (acc += duration),
        0
      );
    return currentDuration;
  };

  (function () {
    $(audio).bind("timeupdate", function () {
      currentTimeAudio = parseFloat(audio.currentTime);
      let excerptsLength = $(".excerpt-text").length;
      for (let i = 0; i < excerptsLength; i++) {
        if (
          currentTimeAudio <= calculateExcerptTime(i + 1) &&
          !stopPlay &&
          !pause
        ) {
          if (currentExcerpt !== i) {
            currentExcerpt = i;
          }
          break;
        }
      }
      addClassesInText(currentExcerpt);
      for (n = 0; n < punctuationsTime.length; n++) {
        if (currentTimeAudio < punctuationsTime[n + 1]) {
          if (sentenceCount !== n) {
            sentenceCount = n;
            addSentences(sentenceCount);
          }
          break;
        }
      }
      startProgressBar();
    });
  })();

  startProgressBar = function () {
    let second, minute, value;
    second = parseInt(audio.currentTime % 60);
    minute = parseInt(audio.currentTime / 60) % 60;
    value = 0;
    if (second < 10) {
      second = "0" + second;
    }
    $("#duration").html(`${minute}:${second}`);
    if (audio.currentTime > 0) {
      value = Math.floor((100 / audio.duration) * audio.currentTime);
    }
    $("#progress").css("width", value + "%");
  };

  addClassesInText = function (count) {
    let normalDuration = 2,
      itemS,
      itemT;
    excerptDuration = $(`.excerpt-text.exc${count}`).attr("data-duration");
    if (
      pause ||
      stopPlay ||
      $(`.exc${count}`).hasClass(`active${excerptDuration}`) ||
      $(`.exc${count}`).hasClass(`active${excerptDuration - 2}`) ||
      $(`.exc${count}`).hasClass(`active${excerptDuration - 4}`) ||
      !$(".excerpt-sentence").hasClass(`exc${count}`)
    ) {
      return;
    } else {
      if (
        0.1 <=
        currentTimeAudio % calculateExcerptTime(currentExcerpt) <
        0.3
      ) {
        excerptDuration -= normalDuration;
      } else if (
        currentTimeAudio % calculateExcerptTime(currentExcerpt) >
        0.3
      ) {
        excerptDuration -= normalDuration * 2;
      }
      itemT = document.querySelector(`.excerpt-text.exc${count}`);
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
      closeTranslateWordOnClick();
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
        excerptInHTML += `<a id=\"word${
          wordCount + wordsCountBefore
        }\" class=\"word-en\" href=\"#\"> ${word}</a>`;
      } else {
        excerptInHTML = `<a id=\"word${
          wordCount + wordsCountBefore
        }\" class=\"word-en\" href=\"#\">${word}</a>`;
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
    let wordText, translationWord, popText;
    $(".word-en").click(function (event) {
      set_pause();
      popText = "";
      event.preventDefault();
      wordText = $(this)
        .text()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      $.getJSON(`/send_word/${wordText}`, function (result) {
        translationWord = result;
        translationWord["translations"]["translation_of_word"].forEach(
          (translation, i) => {
            if (i == 0) {
              popText += `<span class=\"pop-translation\">en: ${translation["en"]} ru: ${translation["ru"]}</span>`;
            } else {
              popText += `<br><span class=\"pop-translation\">en: ${translation["en"]} ru: ${translation["ru"]}</span>`;
            }
          }
        );
        $("#pop_text").replaceWith(`<div id=\"pop_text\">${popText}</div>`);
      });

      $("#overlay").fadeIn(297, function () {
        $("#translation-word")
          .css("display", "block")
          .animate({ opacity: 1 }, 198);
      });
    });
  };

  closeTranslateWordOnClick = function () {
    $("#translation-word-close, #overlay").click(function () {
      $("#translation-word").animate({ opacity: 0 }, 198, function () {
        $(this).css("display", "none");
        $("#overlay").fadeOut(297);
      });
    });
  };

  movingOnToSentence = function () {
    $(".sentence-in-text").click(function (event) {
      let countThisSentence,
        idThisSentence,
        sentenceTime,
        numberOfExcerptsInSentence,
        classOfSentence,
        countExcerptInSentence;
      event.preventDefault();
      idThisSentence = $(this).attr("id");
      countThisSentence = Number(/\d+/.exec(idThisSentence)[0]);
      sentenceTime = punctuationsTime[countThisSentence];
      if (stopPlay) {
        stopPlay = false;
        pause = true;
        for (let i = 0; i < countThisSentence; i++) {
          numberOfExcerptsInSentence = excerptsForText[i]["durations"].length;
          for (let e = 0; e < numberOfExcerptsInSentence; e++) {
            $(`.excerpt-text.exc${currentExcerpt + e}`).addClass("active-fast");
            $(`.excerpt-text.exc${currentExcerpt + e}`).removeClass(
              "active-remove"
            );
          }
          currentExcerpt += numberOfExcerptsInSentence;
        }
        audio.currentTime = sentenceTime;
      } else if (pause) {
        if (sentenceTime > currentTimeAudio) {
          classOfSentence = $(`#sentence${sentenceCount}`)
            .find(".excerpt-text")
            .attr("class");
          countExcerptInSentence = /\d+/.exec(classOfSentence);
          currentExcerpt = Number(countExcerptInSentence[0]);
          for (let i = sentenceCount; i < countThisSentence; i++) {
            numberOfExcerptsInSentence = excerptsForText[i]["durations"].length;
            for (let e = 0; e < numberOfExcerptsInSentence; e++) {
              $(`.excerpt-text.exc${currentExcerpt + e}`).addClass(
                "active-fast"
              );
              $(`.excerpt-text.exc${currentExcerpt + e}`).removeClass(
                "active-remove"
              );
            }
            currentExcerpt += numberOfExcerptsInSentence;
          }
          audio.currentTime = sentenceTime;
        } else if (sentenceTime < currentTimeAudio) {
          moveBack(countThisSentence, sentenceTime);
        }
      } else {
        if (sentenceTime > currentTimeAudio) {
          pause = true;
          audio.pause();
          currentClass = $(`.excerpt-text.exc${currentExcerpt}`).attr("class");
          classDuration = /active\d+/.exec(currentClass);
          $(`.excerpt-text.exc${currentExcerpt}`).removeClass(classDuration);
          $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(
            classDuration
          );
          setTimeout(
            addActiveFastForMovingOn,
            25,
            countThisSentence,
            sentenceTime
          );
        } else if (sentenceTime < currentTimeAudio) {
          set_pause();
          moveBack(countThisSentence, sentenceTime);
        }
      }
    });
  };

  moveBack = function (countThisSentence, sentenceTime) {
    classOfSentence = $(`#sentence${sentenceCount}`)
      .find(".excerpt-text:last")
      .attr("class");
    countExcerptInSentence = /\d+/.exec(classOfSentence);
    currentExcerpt = Number(countExcerptInSentence[0]);
    for (let s = sentenceCount; s >= countThisSentence; s--) {
      numberOfExcerptsInSentence = excerptsForText[s]["durations"].length;
      for (let i = 0; i < numberOfExcerptsInSentence; i++) {
        currentClass = $(`.excerpt-text.exc${currentExcerpt - i}`).attr(
          "class"
        );
        classDuration = /active\d+/.exec(currentClass);
        $(`.excerpt-text.exc${currentExcerpt - i}`).addClass("active-remove");
        $(`.excerpt-text.exc${currentExcerpt - i}`).removeClass(classDuration);
        $(`.excerpt-text.exc${currentExcerpt - i}`).removeClass("active-fast");
      }
      currentExcerpt -= numberOfExcerptsInSentence;
    }
    currentExcerpt += 1;
    audio.currentTime = sentenceTime;
  };

  addActiveFastForMovingOn = function (countThisSentence, sentenceTime) {
    let classOfSentence, countExcerptInSentence, numberOfExcerptsInSentence;
    classOfSentence = $(`#sentence${sentenceCount}`)
      .find(".excerpt-text")
      .attr("class");
    countExcerptInSentence = Number(/\d+/.exec(classOfSentence)[0]);
    currentExcerpt = countExcerptInSentence;
    for (let i = sentenceCount; i < countThisSentence; i++) {
      numberOfExcerptsInSentence = excerptsForText[i]["durations"].length;
      for (let e = 0; e < numberOfExcerptsInSentence; e++) {
        $(`.excerpt-text.exc${currentExcerpt + e}`).addClass("active-fast");
        $(`.excerpt-text.exc${currentExcerpt + e}`).removeClass(
          "active-remove"
        );
      }
      currentExcerpt += numberOfExcerptsInSentence;
    }
    audio.currentTime = sentenceTime;
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
    let currentDuration = calculateExcerptTime(currentExcerpt),
      currentBack;
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
    $(`.excerpt-text.exc${currentExcerpt}`).addClass("active-remove");
    $(`.excerpt-text.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration}`
    );
    $(`.excerpt-text.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration - 2}`
    );
    $(`.excerpt-text.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration - 4}`
    );
    $(`.excerpt-sentence.exc${currentExcerpt}`).addClass("active-remove");
    $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration}`
    );
    $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration - 2}`
    );
    $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(
      `active${excerptDuration - 4}`
    );
    return;
  };

  $(document).keydown(function (e) {
    e.preventDefault();
    if (e.which == 32) {
      if (stopPlay) {
        playFromBeginning();
      } else if (!pause && !stopPlay) {
        set_pause();
      } else {
        resumePlaying();
      }
    }
  });

  $(document).keydown(function (e) {
    e.preventDefault();
    if (e.which == 37) {
      set_back();
    }
  });

  $(document).keydown(function (e) {
    e.preventDefault();
    if (e.which == 39) {
      set_forvard();
    }
  });

  $(document).keydown(function (e) {
    e.preventDefault();
    if (e.which == 40) {
      stop_playing();
    }
  });

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
    currentExcerpt = 0;
    return;
  };

  stopButtonHandler = function () {
    stop_playing();
    return;
  };

  document.getElementById("stop").addEventListener("click", stopButtonHandler);

  set_back = function () {
    let previousSentenceTime,
      currentClass,
      classDuration,
      timeDuration,
      numberOfExcerptsInSentence;
    if (stopPlay || punctuationsTime.indexOf(currentTimeAudio) == 0) {
      return;
    } else if (pause) {
      if (punctuationsTime.indexOf(currentTimeAudio) !== -1) {
        if (currentTimeAudio >= punctuationsTime[punctuationsTime.length - 1]) {
          sentenceCount += 1;
        }
        previousSentenceTime =
          punctuationsTime[punctuationsTime.indexOf(currentTimeAudio) - 1];
        numberOfExcerptsInSentence =
          excerptsForText[sentenceCount - 1]["durations"].length;
        for (let i = 0; i < numberOfExcerptsInSentence; i++) {
          currentClass = $(`.excerpt-text.exc${currentExcerpt - (i + 1)}`).attr(
            "class"
          );
          classDuration = /active\d+/.exec(currentClass);
          $(`.excerpt-text.exc${currentExcerpt - (i + 1)}`).addClass(
            "active-remove"
          );
          $(`.excerpt-text.exc${currentExcerpt - (i + 1)}`).removeClass(
            classDuration
          );
          $(`.excerpt-text.exc${currentExcerpt - (i + 1)}`).removeClass(
            "active-fast"
          );
        }
        currentExcerpt -= numberOfExcerptsInSentence;
        audio.currentTime = previousSentenceTime;
      } else {
        currentExcerpt -= 1;
        currentClass = $(`.excerpt-text.exc${currentExcerpt}`).attr("class");
        classDuration = /active\d+/.exec(currentClass);
        timeDuration =
          $(`.excerpt-text.exc${currentExcerpt}`).attr("data-duration") / 10;
        $(`.excerpt-text.exc${currentExcerpt}`).addClass("active-remove");
        $(`.excerpt-text.exc${currentExcerpt}`).removeClass(classDuration);
        $(`.excerpt-text.exc${currentExcerpt}`).removeClass("active-fast");
        $(`.excerpt-sentence.exc${currentExcerpt}`).addClass("active-remove");
        $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(classDuration);
        $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass("active-fast");
        audio.currentTime -= timeDuration;
      }
    } else {
      set_pause();
    }
  };

  backButtonHandler = function () {
    set_back();
    return;
  };

  set_forvard = function () {
    if (currentTimeAudio >= punctuationsTime[punctuationsTime.length - 1]) {
      return;
    }
    let timeDuration,
      nextSentenceTime,
      numberOfExcerptsInSentence,
      nextExcerptTime;
    if (stopPlay) {
      stopPlay = false;
      pause = true;
      timeDuration = $(`.excerpt-text.exc0`).attr("data-duration") / 10;
      audio.currentTime = timeDuration;
      currentExcerpt = 1;
      $(`.excerpt-text.exc0`).addClass("active-fast");
      $(`.excerpt-text.exc0`).removeClass("active-remove");
      $(`.excerpt-sentence.exc0`).addClass("active-fast");
      $(`.excerpt-sentence.exc0`).removeClass("active-remove");
    } else if (pause) {
      if (punctuationsTime.indexOf(currentTimeAudio) !== -1) {
        nextSentenceTime =
          punctuationsTime[punctuationsTime.indexOf(currentTimeAudio) + 1];
        numberOfExcerptsInSentence =
          excerptsForText[sentenceCount]["durations"].length;
        audio.currentTime = nextSentenceTime;
        for (let i = 0; i < numberOfExcerptsInSentence; i++) {
          currentClass = $(`.excerpt-text.exc${currentExcerpt + i}`).attr(
            "class"
          );
          classDuration = /active\d+/.exec(currentClass);
          $(`.excerpt-text.exc${currentExcerpt + i}`).addClass("active-fast");
          $(`.excerpt-text.exc${currentExcerpt + i}`).removeClass(
            "active-remove"
          );
        }
        currentExcerpt += numberOfExcerptsInSentence;
      } else {
        currentClass = $(`.excerpt-text.exc${currentExcerpt}`).attr("class");
        classDuration = /active\d+/.exec(currentClass);
        timeDuration =
          $(`.excerpt-text.exc${currentExcerpt}`).attr("data-duration") / 10;
        audio.currentTime += timeDuration;
        $(`.excerpt-text.exc${currentExcerpt}`).addClass("active-fast");
        $(`.excerpt-text.exc${currentExcerpt}`).removeClass("active-remove");
        $(`.excerpt-sentence.exc${currentExcerpt}`).addClass("active-fast");
        $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(
          "active-remove"
        );
        currentExcerpt += 1;
      }
    } else {
      nextExcerptTime = calculateExcerptTime(currentExcerpt + 1);
      pause = true;
      audio.pause();
      audio.currentTime = nextExcerptTime;
      currentClass = $(`.excerpt-text.exc${currentExcerpt}`).attr("class");
      classDuration = /active\d+/.exec(currentClass);
      $(`.excerpt-text.exc${currentExcerpt}`).removeClass(classDuration);
      $(`.excerpt-sentence.exc${currentExcerpt}`).removeClass(classDuration);
      setTimeout(addActiveFast, 25);
    }
  };

  addActiveFast = function () {
    $(`.excerpt-text.exc${currentExcerpt}`).addClass("active-fast");
    $(`.excerpt-sentence.exc${currentExcerpt}`).addClass("active-fast");
    currentExcerpt += 1;
  };

  forvardButtonHandler = function () {
    set_forvard();
    return;
  };

  document
    .getElementById("forvard")
    .addEventListener("click", forvardButtonHandler);

  document.getElementById("back").addEventListener("click", backButtonHandler);

  $("#volume").change(function () {
    audio.volume = parseFloat(this.value / 10);
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
