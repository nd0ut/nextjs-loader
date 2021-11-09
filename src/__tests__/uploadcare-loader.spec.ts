import { cleanup } from '@testing-library/react';
import { uploadcareLoader } from '../utils/loader';
import { addEnvVar, removeEnvVar } from './utils';

describe('uploadcareLoader', () => {
  beforeEach(() => {
    cleanup();
  });

  test("The loader returns relative 'src' AS IS in Development environment", () => {
    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    const src = '/relative/image.jpg';

    const result = uploadcareLoader({
      src,
      width: 0,
      quality: 80
    });

    expect(result).toEqual(src);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
  });

  test("The loader builds up a relative 'src' to the absolute URL and passes it to the proxy in Production environment", () => {
    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');
    addEnvVar('NODE_ENV', 'production');

    // When the base path is not set through env vars.

    const src = '/relative/image.jpg';

    let result = uploadcareLoader({
      src,
      width: 0,
      quality: 80
    });

    expect(result).toEqual(src);

    // When the base path is set through env vars.

    const basePath = 'https://example.com';
    addEnvVar('NEXT_PUBLIC_UPLOADCARE_APP_BASE_URL', basePath);

    result = uploadcareLoader({
      src,
      width: 0,
      quality: 80
    });

    expect(result).toEqual(
      `https://test-public-key.ucr.io/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/0x/-/quality/normal/${basePath}${src}`
    );

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_APP_BASE_URL');
    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
    removeEnvVar('NODE_ENV');
  });

  test('The loader requires either a public key or a custom proxy domain', () => {
    const errorMessage =
      'Both NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY and NEXT_PUBLIC_UPLOADCARE_CUSTOM_PROXY_DOMAIN are not set. Please set either one.';

    // 1. The custom proxy domain and public key are not set.

    const t = () => {
      uploadcareLoader({
        src: '',
        width: 0,
        quality: 80
      });
    };
    expect(t).toThrow(errorMessage);

    // 2. The public key is set and the custom proxy domain is not set.

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    expect(t).not.toThrow(errorMessage);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');

    // 3. The custom proxy domain is set and the public key is not set.

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_CUSTOM_PROXY_DOMAIN',
      'https://proxy.example.com'
    );

    expect(t).not.toThrow(errorMessage);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_CUSTOM_PROXY_DOMAIN');
  });

  test('The loader parses user paramters properly', () => {
    const src = 'https:/example.com/image.jpg';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    // No custom parameters.

    let result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/500x/-/quality/normal/https:/example.com/image.jpg'
    );

    // Override default params, including resize and quality.

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS',
      'format/jpg, stretch/on, progressive/no, resize/1x, quality/smart_retina'
    );

    result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/jpg/-/stretch/on/-/progressive/no/-/resize/1x/-/quality/smart_retina/https:/example.com/image.jpg'
    );

    // Add a new parameter (no defaults).

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS',
      'new/parameter'
    );

    result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/500x/-/quality/normal/-/new/parameter/https:/example.com/image.jpg'
    );

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS');
  });

  test("The loader doesn't process SVG and GIF (absolute url)", () => {
    const src = 'https:/example.com/image.svg';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    const result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(src);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
  });

  test("The loader doesn't process SVG and GIF (relative url)", () => {
    const src = '/image.svg';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    const result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(src);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
  });

  test('The loader returns SVG and GIF hosted on the CDN as is', () => {
    const src =
      'https://ucarecdn.com/375bba4b-35db-4cb8-8fc7-7540625f2181/next.svg';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    const result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(src);

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
  });

  test('The loader processes images hosted on the default CDN domain properly', () => {
    const src =
      'https://ucarecdn.com/a6f8abc8-f92e-460a-b7a1-c5cd70a18cdb/vercel.png';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    const result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(
      `https://ucarecdn.com/a6f8abc8-f92e-460a-b7a1-c5cd70a18cdb/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/500x/-/quality/normal/vercel.png`
    );

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
  });

  test('The loader processes images hosted on a custom CDN domain properly', () => {
    const src = 'https://cdn.example.com/image.png';

    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');
    addEnvVar('NEXT_PUBLIC_UPLOADCARE_CUSTOM_CDN_DOMAIN', 'cdn.example.com');

    const result = uploadcareLoader({
      src,
      width: 500,
      quality: 80
    });

    expect(result).toBe(
      `https://cdn.example.com/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/500x/-/quality/normal/image.png`
    );

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_CUSTOM_CDN_DOMAIN');
  });

  test('The loader sets max resolution for different formats properly', () => {
    addEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY', 'test-public-key');

    // Not a jpg image. Should be max 3000 width.

    let src = 'https:/example.com/image.png';

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS',
      'format/auto'
    );

    let result = uploadcareLoader({
      src,
      width: 9999,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/3000x/-/quality/normal/https:/example.com/image.png'
    );

    // Jpg image by format. Should be max 5000 width.

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS',
      'format/jpeg'
    );

    result = uploadcareLoader({
      src,
      width: 9999,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/jpeg/-/stretch/off/-/progressive/yes/-/resize/5000x/-/quality/normal/https:/example.com/image.png'
    );

    // // Jpg image by extension with auto format. Should be max 5000 width.

    src = 'https:/example.com/image.jpg';

    addEnvVar(
      'NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS',
      'format/auto'
    );

    result = uploadcareLoader({
      src,
      width: 9999,
      quality: 80
    });

    expect(result).toBe(
      'https://test-public-key.ucr.io/-/format/auto/-/stretch/off/-/progressive/yes/-/resize/5000x/-/quality/normal/https:/example.com/image.jpg'
    );

    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY');
    removeEnvVar('NEXT_PUBLIC_UPLOADCARE_TRANSFORMATION_PARAMETERS');
  });
});
