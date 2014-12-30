(function(){
  this.el = function(id){
    console.log("el", $("#"+id)[0])
    return $("#"+id)[0]
  }
})(this)