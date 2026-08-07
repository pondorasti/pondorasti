// array of apps as json
function updateStatus() {
  if (localStorage == 0) {
    $("#status").html("You're not a supporter")
  } else {
    $("#status").html(`You've supported me <b>${localStorage.supports}</b> times.`)
  }

  var background = ""
  var text = ""
  var border = "0"

  if (localStorage.supports >= 2500) {
    background = "#eb909f"
    text = "#d9bed1"
    border = "5px"
  } else if (localStorage.supports >= 1000) {
    background = "#fe71cf"
    text = "#fffb97"
  } else if (localStorage.supports >= 500) {
    background = "#060d15"
    text = "#ede0fa"
  } else if (localStorage.supports >= 250) {
    background = "black"
    text = "red"
  } else if (localStorage.supports >= 100) {
    background = "white"
    text = "black"
  } else {
    background = "white"
    text = "black"
  }

  // $("img").attr("src", "images/faces/octocat.png");

  $("*").css("color", text)
  $("*").css("background-color", background)
  $(".button").css("border-color", text)

  $("#main img").css("border-width", border)

  $(".button").hover(
    function () {
      $(this).css("background-color", text)
      $(this).css("color", background)
    },
    function () {
      $(this).css("background-color", background)
      $(this).css("color", text)
    }
  )
}

$("#support").click(function () {
  $("img").fadeTo(500, 0.1).fadeTo(500, 1)
  localStorage.supports++
  updateStatus()
  window.fathom.trackGoal("1WTW2T47", 0)
})

$("#main status").ready(function () {
  if (!localStorage.supports) {
    localStorage.supports = 0
  }
  updateStatus()
})

$("#navbar #button").click(function () {
  $("#overlay").fadeToggle()
})

$("#overlay").ready(function () {
  $("#overlay").fadeToggle()
})
