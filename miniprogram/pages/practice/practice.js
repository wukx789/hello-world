const api = require("../../utils/api.js");

Page({
  data: {
    loading: true,
    error: "",
    passage: null,
    exercise: null,
    board: [],
    bank: [],
    selectedChipId: "",
    selectedSlot: -1,
    attempts: 0,
    petName: "大黄",
    petImage: "",
    points: 0,
    feedback: false,
    feedbackType: "",
    feedbackTitle: "",
    revealEn: "",
    revealZh: "",
    noteZh: "",
    gained: 0,
  },

  onLoad: function () {
    this.bootstrap();
  },

  bootstrap: function () {
    const that = this;
    this.setData({ loading: true, error: "" });
    Promise.all([api.fetchPassage(), api.fetchPet()])
      .then(function (pair) {
        that.applyPet(pair[1]);
        that.applyPassage(pair[0]);
      })
      .catch(function (err) {
        that.setData({
          error:
            "无法连接服务端：" +
            (err.message || err) +
            "。请先启动 juwo-server（端口 8787）。",
          loading: false,
        });
      });
  },

  applyPet: function (pet) {
    this.setData({
      petName: pet.nameZh + " · " + pet.stage.titleZh,
      petImage: api.assetUrl(pet.stage.image),
      points: pet.points,
    });
  },

  applyPassage: function (passage) {
    const exercise = passage.exercises[0];
    const board = exercise.slots.map(function (s) {
      return {
        index: s.index,
        isAnchor: s.isAnchor,
        correct: s.text,
        filled: s.isAnchor,
        chipId: s.isAnchor ? "anchor-" + s.index : "",
        display: s.isAnchor ? s.text : "",
      };
    });
    this.setData({
      passage: passage,
      exercise: exercise,
      board: board,
      bank: exercise.bank.map(function (b) {
        return { id: b.id, text: b.text };
      }),
      loading: false,
      attempts: 0,
      feedback: false,
      selectedChipId: "",
      selectedSlot: -1,
      revealEn: "",
      revealZh: "",
      noteZh: "",
      gained: 0,
    });
  },

  onTapChip: function (e) {
    const id = e.currentTarget.dataset.id;
    const selectedSlot = this.data.selectedSlot;
    const board = this.data.board;
    if (selectedSlot >= 0 && !board[selectedSlot].isAnchor && !board[selectedSlot].filled) {
      this.placeChipInSlot(id, selectedSlot);
      return;
    }
    this.setData({
      selectedChipId: id === this.data.selectedChipId ? "" : id,
      selectedSlot: -1,
    });
  },

  onTapSlot: function (e) {
    const index = Number(e.currentTarget.dataset.index);
    const slot = this.data.board[index];
    if (slot.isAnchor) return;
    if (slot.filled) {
      this.returnChipToBank(index);
      return;
    }
    if (this.data.selectedChipId) {
      this.placeChipInSlot(this.data.selectedChipId, index);
      return;
    }
    this.setData({ selectedSlot: index, selectedChipId: "" });
  },

  placeChipInSlot: function (chipId, slotIndex) {
    const chip = this.data.bank.find(function (c) {
      return c.id === chipId;
    });
    if (!chip) return;
    const board = this.data.board.map(function (s) {
      return Object.assign({}, s);
    });
    const existingId = board[slotIndex].chipId;
    let bank = this.data.bank.filter(function (c) {
      return c.id !== chipId;
    });
    if (existingId) {
      bank = bank.concat([{ id: existingId, text: board[slotIndex].display }]);
    }
    board[slotIndex] = Object.assign({}, board[slotIndex], {
      filled: true,
      chipId: chipId,
      display: chip.text,
    });
    this.setData({ board: board, bank: bank, selectedChipId: "", selectedSlot: -1 });
  },

  returnChipToBank: function (slotIndex) {
    const board = this.data.board.map(function (s) {
      return Object.assign({}, s);
    });
    const slot = board[slotIndex];
    if (slot.isAnchor || !slot.filled) return;
    const bank = this.data.bank.concat([{ id: slot.chipId, text: slot.display }]);
    board[slotIndex] = Object.assign({}, slot, { filled: false, chipId: "", display: "" });
    this.setData({ board: board, bank: bank, selectedChipId: "", selectedSlot: -1 });
  },

  onSubmit: function () {
    const that = this;
    const board = this.data.board;
    const exercise = this.data.exercise;
    const passage = this.data.passage;
    if (board.some(function (s) { return !s.filled; })) {
      this.setData({
        feedback: true,
        feedbackType: "bad",
        feedbackTitle: "先填满所有空格",
        revealEn: "",
        revealZh: "",
        noteZh: "",
        gained: 0,
      });
      return;
    }

    const answerTokens = board.map(function (s) { return s.display; });
    const nextAttempts = this.data.attempts + 1;
    this.setData({ attempts: nextAttempts });

    api
      .submitExercise({
        passageId: passage.passageId,
        exerciseId: exercise.id || "s1",
        exerciseKey: passage.passageId + ":" + (exercise.id || "s1"),
        expectedEn: exercise.en,
        expectedZh: exercise.zh,
        noteZh: exercise.noteZh,
        answerTokens: answerTokens,
        firstTry: nextAttempts === 1,
      })
      .then(function (result) {
        if (result.correct) {
          that.applyPet(result.pet);
          that.setData({
            feedback: true,
            feedbackType: "ok",
            feedbackTitle: "拼对了",
            revealEn: result.revealEn,
            revealZh: result.revealZh,
            noteZh: result.noteZh,
            gained: result.gained || 0,
          });
        } else {
          // PLAN: wrong answer directly reveals the correct sentence
          that.setData({
            feedback: true,
            feedbackType: "bad",
            feedbackTitle: "不太对，正确答案是：",
            revealEn: result.revealEn,
            revealZh: result.revealZh,
            noteZh: result.noteZh,
            gained: 0,
          });
        }
      })
      .catch(function (err) {
        that.setData({
          feedback: true,
          feedbackType: "bad",
          feedbackTitle: "提交失败：" + (err.message || err),
          revealEn: "",
          revealZh: "",
          noteZh: "",
          gained: 0,
        });
      });
  },

  onReset: function () {
    if (!this.data.passage) return;
    this.applyPassage(this.data.passage);
  },

  onCheckIn: function () {
    const that = this;
    api
      .checkIn()
      .then(function (result) {
        that.applyPet(result.pet);
        wx.showToast({
          title: result.alreadyCheckedIn ? "今天已打过卡" : "+" + result.gained + " 积分",
          icon: "none",
        });
      })
      .catch(function () {
        wx.showToast({ title: "打卡失败", icon: "none" });
      });
  },
});
