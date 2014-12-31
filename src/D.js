var DataSource = require("./DataSource")

function D( name, def ){
  if( def || !this.defs[name] ){
    this.defs[name] = new DataSource( name, def||{})
  }
  return this.defs[name]
}

D.prototype = {
  defs : {}
}

module.exports = D.bind( D.prototype )





