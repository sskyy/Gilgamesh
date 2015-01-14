(function(global){

  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var FN_ARG_SPLIT = /,/;
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

  function annotate (fn) {
    var $inject = [];
    fn = fn.toString();
    var first = fn.replace(STRIP_COMMENTS, '');
    var second = first.match(FN_ARGS)[1];
    var third = second.split(FN_ARG_SPLIT);
    third.forEach(function (arg) {
      arg.replace(FN_ARG, function (all, underscore, name) {
        $inject.push(name);
      });
    });
    return $inject;
  }

  function replaceEmptyInnerHTML( $target, $source ){
    if( isEmptyInnerHTML($target) ){
      $target.innerHTML =  $source.innerHTML
    }
  }

  function replaceSourceInnerHTML( $target, $source ){
    if( !isEmptyInnerHTML($source) ){
      $target.innerHTML =  $source.innerHTML
    }
  }

  function isEmptyInnerHTML( el ){
    return /^\s*$/.test( el.innerHTML)
  }

  function replaceWith(  toReplace, target){
    var parent = target.parentNode
    parent.replaceChild( toReplace, target)
  }

  function removeElement( el ){
    el.parentNode.removeChild(el)
  }

  function replaceInnerHTML( toReplace, target){
    target.innerHTML = toReplace.innerHTML
  }

  function mergeArray( target, source ){
    for( var i in source){
      if( target.indexOf( source[i]) == -1 ){
        target.push( source[i])
      }
    }
    return target
  }

  function mergeEl( target, source ){
    for( var i in source.attributes ){
      if( source.attributes[i].nodeName
        && target.getAttribute(source.attributes[i].nodeName) === null
        && source.attributes[i].nodeName !== "class"
        && source.attributes[i].nodeName !== "style"  ){

        console.log("setting",source.attributes[i].nodeName,source)

        target.setAttribute(source.attributes[i].nodeName,source.attributes[i].value )
      }
    }

    target.className = mergeArray( target.className.split(" "), source.className.split(" ")).join(" ")
    return target
  }

  global._CACHE_ID = -1
  global._CACHE_ATTRIBUTE = "gm-child-cache-id"
  global._ORIGIN_ELEMENT_CACHE = {}
  global._GM_DIRECTIVE_NAMES = []


  //gm directive map, used for extend
  var directives = {}

  var _module = angular.module
  angular.module = function(){
    var module = _module.apply( angular, arguments)

    module.component = function(name, directiveDef){
      var directiveDefArgs = annotate( directiveDef )

      var replacedDirectiveDef = function(){
        var directive =  directiveDef.apply( directiveDef, arguments)

        if( directive.template || directive.templateUrl ){



          //TODO add tag name support
          angular.forEach( document.querySelectorAll("["+name.replace(/([A-Z])/g,"-$1").toLowerCase()+"]"), function( el ){
            if( el.getAttribute(global._CACHE_ATTRIBUTE) !== null ) return
            ++global._CACHE_ID
            global._ORIGIN_ELEMENT_CACHE[global._CACHE_ID] = el.cloneNode(true)
            el.setAttribute(global._CACHE_ATTRIBUTE,global._CACHE_ID)
          })
          global._GM_DIRECTIVE_NAMES.push(name)
        }

        if( directive.compile ) throw new Error("you cannot wrap a directive with compile")
        if( directive.transclude ) throw new Error("you cannot wrap a directive with transclude")


        //must init a scope
        if( !directive.scope ) directive.scope = true
        //deal with replace, we do manually replace
        directive._replace = directive.replace
        delete directive.replace


        directive.compile = function( $el ){

          var compilingImportEls = []

          //should only compile once and only compile with the one that has template
          if( (directive.template || directive.templateUrl) && $el[0].getAttribute("gm-tpl-overwrote") === null ) {
            if( directive._replace){
              if( $el[0].childNodes.length >1 ){
                console.log("you have multiple child nodes in directive", name, "cannot replace")
              }else{
                mergeEl($el[0], $el[0].childNodes[0])
                $el[0].innerHTML = $el[0].childNodes[0].innerHTML
              }
            }

            var originEl = global._ORIGIN_ELEMENT_CACHE[$el[0].getAttribute(global._CACHE_ATTRIBUTE)]
            var compileElClone = $el[0].cloneNode(true)
            var totalOverwrite = !isEmptyInnerHTML(originEl)

            //only include particular child element
            if( originEl.getAttribute("gm-tpl-include") !== null ){
              totalOverwrite = false
              angular.forEach( originEl.childNodes, function( childEl ){
                if( !childEl.getAttribute ) return
                var roleEl = $el[0].querySelector("[gm-role="+ childEl.getAttribute("gm-role")+"]")
                if( roleEl ){
                  replaceEmptyInnerHTML(childEl,roleEl )
                }
                $el[0].innerHTML = originEl.innerHTML
              })
            }

            //only overwrite particular element
            if( originEl.getAttribute('gm-tpl-partial') !==null ){
              totalOverwrite = false
              angular.forEach(originEl.childNodes,function(roleEl){
                //exclude text, comment and other node type
                if( !roleEl.getAttribute ) return
                var role = roleEl.getAttribute("gm-role")

                angular.forEach($el[0].querySelectorAll("[gm-role="+role+"]"),function( targetEl){
                  replaceEmptyInnerHTML( roleEl, targetEl)
                  replaceWith( roleEl, targetEl)
                })
              })
            }


            if( originEl.getAttribute('gm-tpl-exclude') !==null ){
              totalOverwrite = false
              $el[0].getAttribute('gm-tpl-exclude').split(",").forEach(function( roleToExclude){

                removeElement($el[0].querySelector("[gm-role="+roleToExclude+"]"))
              })
            }

            if( totalOverwrite ){
              $el[0].innerHTML = originEl.innerHTML
            }

            //handle import with gm-role
            var id = originEl.getAttribute("id")
            angular.forEach(document.querySelectorAll("[gm-import="+id+"]"),function(importEl){
              var tobeCompiledCloneEl
              var roleEl,roleName

              if( importEl.getAttribute("gm-from-role")!==null ){
                roleName = importEl.getAttribute("gm-from-role")

                roleEl = compileElClone.querySelector("[gm-role="+ roleName+"]")
                if( roleEl ){

                  tobeCompiledCloneEl = roleEl.cloneNode(true)
                  tobeCompiledCloneEl.setAttribute("gm-import",id)
                  if( !isEmptyInnerHTML(importEl)){
                    replaceInnerHTML(importEl, tobeCompiledCloneEl)
                  }

                  //attribute overwrite
                  mergeEl(tobeCompiledCloneEl,importEl)

                  console.log( tobeCompiledCloneEl)
                }else{
                  console.log("no such role",roleName,"in element", $el[0])
                }

              }else{
                tobeCompiledCloneEl = importEl.cloneNode(true)
              }

              $el[0].appendChild( tobeCompiledCloneEl )
              tobeCompiledCloneEl.setAttribute("gm-imported",importEl.getAttribute("gm-import"))
              tobeCompiledCloneEl.removeAttribute("gm-import")


              compilingImportEls.push([ importEl, tobeCompiledCloneEl ])
            })



            $el[0].setAttribute("gm-tpl-overwrote",true)
          }

          return function( $scope, $el, $attrs){
            //deal with imported elements
            if( compilingImportEls.length){
              window.setTimeout(function(){
                var resetEl
                while( resetEl = compilingImportEls.pop() ){
                  replaceWith( resetEl[1],resetEl[0] )
                }
              },1)
            }

            //define magic attributes
            $scope.$$id = $el[0].id

            //deal with extend
            var ancestors = [],
              currentAncestor
            if( directive.extend ){
              if( !directives[directive.extend] ){
                console.log("parent gm directive not found", directive.extend)
              }else{

                currentAncestor = directive.extend
                while( currentAncestor ) {
                  if( !directives[currentAncestor].ins){
                    directives[currentAncestor].ins = angular.element(document).injector().invoke(directives[currentAncestor].def);
                  }
                  ancestors.push( directives[currentAncestor].ins )
                  currentAncestor = directives[currentAncestor].ins.extend //string or undefined
                }

                //caution!!! we reused var currentAncestor
                while( currentAncestor = ancestors.pop()){
                  currentAncestor.link.call(directive, $scope, $el, $attrs)
                }
              }
            }

            //deal with events
            if( $el[0].getAttribute("gm-linked") === null){
              for( var i in $el[0].attributes ){
                if( $el[0].attributes[i].nodeName && /^(on|scope-on)-/.test($el[0].attributes[i].nodeName)){
                  //Caution, we run callbacks on parent scope
                  var event = $el[0].attributes[i].nodeName.replace(/^(on|scope-on)-/,"")
                  var handler = $el[0].attributes[i].value
                  console.log("listen on", event)
                  $el[0].addEventListener(event, function(e){
                    if( /^scope-on-/.test($el[0].attributes[i].nodeName) ){
                      $scope.$parent.$eval(handler+"( $event)", {"$event":e})
                    }else{
                      (new Function('e',handler+".call(this,e)"))(e)
                    }
                  })
                }
              }
            }



            $el[0].getAttribute("gm-linked",true)
            return directive.link.call(directive, $scope, $el, $attrs)
          }

        }
        directive.isComponent = true
        directives[name].ins = directive
        return directive
      }

      //save it
      directives[name]= {
        def : directiveDef
      }

      replacedDirectiveDef.$inject = directiveDefArgs
      return module.directive( name, replacedDirectiveDef)
    }

    return module
  }

})(window||this)







