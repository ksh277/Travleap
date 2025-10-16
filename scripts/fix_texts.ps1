$ErrorActionPreference = 'Stop'

function Set-Line {
    param([ref]$arr, [int]$idx, [string]$text)
    if ($idx -ge 0 -and $idx -lt $arr.Value.Count) { $arr.Value[$idx] = $text }
}

function Fix-App {
    $base = Join-Path $PSScriptRoot '..'
    $path = Join-Path $base 'App.tsx'
    if (-not (Test-Path $path)) { return }
    $lines = Get-Content -Path $path
    for ($i=0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'animate-spin.*border-purple-600') {
            if ($i+1 -lt $lines.Count -and $lines[$i+1] -match '<p className="text-gray-600">') {
                $lines[$i+1] = '                  <p className="text-gray-600">세션 확인 중...</p>'
                break
            }
        }
    }
    Set-Content -Path $path -Value $lines -Encoding UTF8
}

function Fix-HomePage {
    $base = Join-Path $PSScriptRoot '..'
    $components = Join-Path $base 'components'
    $path = Join-Path $components 'HomePage.tsx'
    if (-not (Test-Path $path)) { return }
    $h = Get-Content -Path $path

    # Hero subtitle: replace inner text line after opening <p ... animate-fade-in-delay>
    for($i=0; $i -lt $h.Count-2; $i++){
      if($h[$i] -match 'animate-fade-in-delay">$'){
        $h[$i+1] = '              취향에 맞는 여행 상품을 찾아보세요.'
        break
      }
    }

    function Fix-CardBlock {
      param([string]$slug, [string]$label, [string]$tag, [string]$classStr, [ref]$arr)
      for($i=0; $i -lt $arr.Value.Count; $i++){
        if($arr.Value[$i] -match "navigate\('/category/$slug'\)"){
          for($j=$i; $j -lt [math]::Min($i+12,$arr.Value.Count-1); $j++){
            if($arr.Value[$j] -match '^\s*alt=\"'){
              $arr.Value[$j] = "                    alt=`"$label`""
              break
            }
          }
          for($j=$i; $j -lt [math]::Min($i+20,$arr.Value.Count-1); $j++){
            if($arr.Value[$j] -match "^\s*<$tag "){
              $arr.Value[$j] = ('                    <' + $tag + ' className="' + $classStr + '">' + $label + '</' + $tag + '>')
              break
            }
          }
        }
      }
    }

    Fix-CardBlock -slug 'stay' -label '신안 숙소' -tag 'h3' -classStr 'text-xl md:text-2xl font-semibold mb-1' -arr ([ref]$h)
    Fix-CardBlock -slug 'tour' -label '신안 투어' -tag 'h3' -classStr 'text-xl md:text-2xl font-semibold mb-1' -arr ([ref]$h)
    Fix-CardBlock -slug 'experience' -label '신안 체험' -tag 'h4' -classStr 'text-base md:text-lg font-semibold' -arr ([ref]$h)
    Fix-CardBlock -slug 'food' -label '신안 맛집' -tag 'h4' -classStr 'text-base md:text-lg font-semibold' -arr ([ref]$h)
    Fix-CardBlock -slug 'attraction' -label '신안 관광지' -tag 'h4' -classStr 'text-base md:text-lg font-semibold' -arr ([ref]$h)

    # Price unit '/1인'
    for($i=0; $i -lt $h.Count; $i++){
      if($h[$i] -match 'text-sm text-gray-600 ml-1'){
        $h[$i] = '                              <span className="text-sm text-gray-600 ml-1">/1인</span>'
      }
    }
    # Else price text -> '가격 문의' (span without ml-1)
    for($i=0; $i -lt $h.Count; $i++){
      if($h[$i] -match 'className=\"text-sm text-gray-600\"' -and $h[$i] -notmatch 'ml-1'){
        $h[$i] = '                            <span className="text-sm text-gray-600">가격 문의</span>'
      }
    }

    # Clean stray plain-text lines (indented, no tags)
    $h = $h | Where-Object { $_ -notmatch '^[ ]{8,}[^<>]+$' }

    Set-Content -Path $path -Value $h -Encoding UTF8
}

Fix-App
Fix-HomePage
Write-Output 'Applied fixes to App.tsx and HomePage.tsx'
