import { readFileSync } from 'fs';
import { join } from 'path';
import { validateProfilePhoto } from './rund-photo-validation';

const png = readFileSync(join(__dirname,'__fixtures__/profile-photo.png'));
const jpeg = readFileSync(join(__dirname,'__fixtures__/profile-photo.jpeg'));
function repairCrc(image: Buffer, offset: number) {
  const end = offset + 8 + image.readUInt32BE(offset);
  let crc = -1;
  for (const byte of image.subarray(offset + 4,end)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  image.writeUInt32BE((crc ^ -1) >>> 0,end);
}
const resizedHeader = (width: number,height: number) => {
  const image = Buffer.from(png); image.writeUInt32BE(width,16); image.writeUInt32BE(height,20); repairCrc(image,8); return image;
};
describe('Restricciones binarias de foto de perfil',()=>{
  const file=(buffer=png,originalname='foto.png',mimetype='image/png')=>({ buffer,originalname,mimetype });
  it('acepta PNG generado por un navegador real',()=>expect(validateProfilePhoto(file())).toEqual({ width: 200,height: 200,mime: 'image/png' }));
  it('acepta JPEG generado por un navegador real',()=>expect(validateProfilePhoto(file(jpeg,'foto.JPEG','image/jpeg'))).toEqual({ width: 200,height: 200,mime: 'image/jpeg' }));
  it.each([file(Buffer.from('<svg/>')),file(png,'foto.jpg','image/jpeg'),file(Buffer.alloc(2097153)),file(resizedHeader(199,200)),file(resizedHeader(200,4097)),file(png.subarray(0,40))])('rechaza formato, tamaño o dimensiones inválidas',invalid=>expect(()=>validateProfilePhoto(invalid)).toThrow());
  it('rechaza un PNG con CRC incorrecto',()=>{
    const image=Buffer.from(png); image[29]^=255;
    expect(()=>validateProfilePhoto(file(image))).toThrow('Imagen inválida');
  });
  it('rechaza datos PNG corruptos aunque se haya reparado su CRC',()=>{
    const image=Buffer.from(png);
    for(let offset=8;offset+12<=image.length;offset+=image.readUInt32BE(offset)+12) {
      if(image.toString('ascii',offset+4,offset+8)==='IDAT') { image[offset+8]=0; repairCrc(image,offset); break; }
    }
    expect(()=>validateProfilePhoto(file(image))).toThrow('Imagen inválida');
  });
  it('rechaza una cabecera PNG cuyas dimensiones no corresponden a los píxeles',()=>expect(()=>validateProfilePhoto(file(resizedHeader(300,300)))).toThrow('Imagen inválida'));
  it('rechaza un JPEG truncado que conserva el marcador de fin',()=>{
    const image=Buffer.concat([jpeg.subarray(0,30),Buffer.from([255,217])]);
    expect(()=>validateProfilePhoto(file(image,'foto.jpg','image/jpeg'))).toThrow('Imagen inválida');
  });
  it('rechaza un JPEG sin ningún escaneo aunque tenga dimensiones y fin',()=>{
    let frame = -1;
    for(let index=2;index<jpeg.length-4;index++) if(jpeg[index]===255 && [192,193,194].includes(jpeg[index+1])) { frame=index; break; }
    expect(frame).toBeGreaterThan(0);
    const end = frame + 2 + jpeg.readUInt16BE(frame+2);
    expect(()=>validateProfilePhoto(file(Buffer.concat([jpeg.subarray(0,end),Buffer.from([255,217])]),'foto.jpg','image/jpeg'))).toThrow('Imagen inválida');
  });
});
