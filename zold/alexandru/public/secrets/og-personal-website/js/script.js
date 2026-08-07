$("#grid").ready(function () {
  data.forEach(function (element) {
    $("#grid").append(`\
			<div class="card" in-viewport="false"><a target=_blank href=\"${element.link}\">\
        <img id="thumbnail" alt="${element.name}" title="${element.name}" src=\"${element.img}\">\
        <p id="name">${element.name}</p>\
        <p id="details">${element.details}</p>\
			</a></div>`)
  })
})

$("#navbar #button").click(function () {
  $("#overlay").fadeToggle()
})

$("#overlay").ready(function () {
  $("#overlay").fadeToggle()
})

$(document).scroll(function () {
  var offset = window.pageYOffset
  var height = window.innerHeight
  $(".card").each(function () {
    var card = $(this)
    var top = card.offset().top
    var cardHeight = card.height()
    if (card.attr("in-viewport") == "false") {
      card.fadeTo(0, 0.01)
      if (top < offset + height && top > offset - cardHeight + 64) {
        card.attr("in-viewport", "true")
        card.fadeTo(100, 1)
      }
    } else {
      card.fadeTo(0, 1)
      if (top > offset + height || top < offset - cardHeight + 64) {
        card.attr("in-viewport", "false")
        card.fadeTo(100, 0.01)
      }
    }
  })
})
