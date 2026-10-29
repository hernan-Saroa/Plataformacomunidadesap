import { validateProfilePhoto } from './rund-photo-validation';
import { deflateSync } from 'zlib';

export function pngFixture(width=200,height=200) {
  const chunk=(name: string,data: Buffer)=>{
    const result=Buffer.alloc(data.length+12); result.writeUInt32BE(data.length); result.write(name,4); data.copy(result,8); return result;
  };
  const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8; header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*3+1)*height))),chunk('IEND',Buffer.alloc(0))]);
}
describe('Restricciones binarias de foto de perfil',()=>{
  const file=(buffer=pngFixture(),originalname='foto.png',mimetype='image/png')=>({ buffer,originalname,mimetype });
  it('acepta PNG con las dimensiones mínimas',()=>expect(validateProfilePhoto(file())).toEqual({ width: 200,height: 200,mime: 'image/png' }));
  it.each([file(Buffer.from('<svg/>')),file(pngFixture(),'foto.jpg','image/jpeg'),file(Buffer.alloc(2097153)),file(pngFixture(199,200)),file(pngFixture(200,4097)),file(pngFixture().subarray(0,40))])('rechaza formato, tamaño o dimensiones inválidas',invalid=>expect(()=>validateProfilePhoto(invalid)).toThrow());
});
