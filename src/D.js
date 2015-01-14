var DataSource = require("./DataSource")

function D( name, def ){

  if( def || !this.defs[name]){
    if( this.defs[name] ) console.log( name+" has already defined. we will overwrite it")
    this.defs[name] = new DataSource( name, def||{})
  }

  return this.defs[name]
}

D.prototype.defs = {}


module.exports = D.bind(D.prototype)




