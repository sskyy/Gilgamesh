(function( global ){
  var D = require("./D.js")
  global.D = D.bind( D.prototype )
  global.DataSource = require("./DataSource")
  global.E = require("./Element.js")
})(window||this)