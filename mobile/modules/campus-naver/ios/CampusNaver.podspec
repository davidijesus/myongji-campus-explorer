Pod::Spec.new do |s|
  s.name = 'CampusNaver'
  s.version = '0.1.0'
  s.summary = 'First-party Expo view for the official Naver Maps SDK'
  s.description = 'Campus markers and verified route overlays. No provider model extraction.'
  s.license = { :type => 'MIT' }
  s.author = 'Campus Explorer contributors'
  s.homepage = 'https://www.mju.ac.kr/us/3407/subview.do'
  s.platforms = { :ios => '16.4' }
  s.source = { :path => '.' }
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  # Resolve the official 3.x SDK when pods can be installed, then commit Podfile.lock.
  # NMapsMap is a dynamic framework; do not force it into a static-framework build.
  s.dependency 'NMapsMap', '>= 3.0', '< 4.0'
end
